import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailSettings, SettingsService } from '../settings';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface MailResult {
  ok: boolean;
  provider: 'smtp' | 'resend' | 'none';
  error?: string;
}

interface ResolvedConfig {
  provider: 'smtp' | 'resend' | 'none';
  from: string;
  replyTo: string | null;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string | null;
    pass: string | null;
  };
  resendApiKey?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

// Sends email through the provider chosen in the admin dashboard
// (Settings → Email): SMTP or Resend. If nothing is configured there, the
// MAIL_* environment variables are used as an SMTP fallback; if those are
// missing too, the message is written to the log instead.
//
// Sending never throws: callers get { ok: false, error } so a mail outage can
// never break checkout or any other request.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: { key: string; instance: Transporter } | null = null;

  constructor(
    private config: ConfigService,
    private settings: SettingsService,
  ) {}

  isValidEmail(email: string | null | undefined): boolean {
    return !!email && email.length <= 254 && EMAIL_RE.test(email);
  }

  async send(message: MailMessage): Promise<MailResult> {
    const cfg = await this.resolveConfig();
    return this.deliver(cfg, message);
  }

  // Sends a test email using either the saved settings or unsaved values
  // from the admin form (so admins can test before saving).
  async sendTest(
    to: string,
    overrides: Partial<EmailSettings> = {},
  ): Promise<MailResult> {
    const saved = await this.settings.get('email');
    const merged: EmailSettings = {
      ...saved,
      ...Object.fromEntries(
        Object.entries(overrides).filter(([, v]) => v !== undefined),
      ),
    };
    const cfg = this.fromSettings(merged);
    if (cfg.provider === 'none') {
      return {
        ok: false,
        provider: 'none',
        error: 'Email provider is "none". Choose SMTP or Resend first.',
      };
    }
    const { storeName } = await this.settings.get('site');
    return this.deliver(cfg, {
      to,
      subject: `${storeName}: test email`,
      text: `This is a test email from ${storeName}. Your ${cfg.provider.toUpperCase()} email settings work.`,
      html: `<p>This is a test email from <strong>${escapeAttr(storeName)}</strong>.</p><p>Your ${cfg.provider.toUpperCase()} email settings work.</p>`,
    });
  }

  private async deliver(
    cfg: ResolvedConfig,
    message: MailMessage,
  ): Promise<MailResult> {
    if (!this.isValidEmail(message.to)) {
      return {
        ok: false,
        provider: cfg.provider,
        error: `Invalid recipient: ${message.to}`,
      };
    }
    // Header injection guard: subjects are single-line.
    const subject = message.subject.replace(/[\r\n]+/g, ' ').slice(0, 250);
    const replyTo = message.replyTo ?? cfg.replyTo ?? undefined;

    if (cfg.provider === 'none') {
      this.logger.warn(
        `Email not configured (Admin → Settings → Email). Email to ${message.to} not sent.\n` +
          `Subject: ${subject}\n${message.text}`,
      );
      return { ok: false, provider: 'none', error: 'Email is not configured' };
    }

    try {
      if (cfg.provider === 'resend') {
        await this.sendViaResend(cfg, { ...message, subject, replyTo });
      } else {
        await this.getTransporter(cfg).sendMail({
          from: cfg.from,
          to: message.to,
          subject,
          html: message.html,
          text: message.text,
          replyTo,
        });
      }
      return { ok: true, provider: cfg.provider };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email via ${cfg.provider} to ${message.to}: ${msg}`,
      );
      return { ok: false, provider: cfg.provider, error: msg };
    }
  }

  private async sendViaResend(cfg: ResolvedConfig, message: MailMessage) {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let detail = body;
      try {
        const parsed = JSON.parse(body) as { message?: string };
        detail = parsed.message ?? body;
      } catch {
        // keep raw body
      }
      throw new Error(`Resend API ${res.status}: ${detail.slice(0, 300)}`);
    }
  }

  private getTransporter(cfg: ResolvedConfig): Transporter {
    const smtp = cfg.smtp!;
    const key = JSON.stringify(smtp);
    if (this.transporter?.key !== key) {
      this.transporter?.instance.close();
      this.transporter = {
        key,
        instance: nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth: smtp.user
            ? { user: smtp.user, pass: smtp.pass ?? '' }
            : undefined,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 20000,
        }),
      };
    }
    return this.transporter.instance;
  }

  private async resolveConfig(): Promise<ResolvedConfig> {
    const settings = await this.settings.get('email');
    const cfg = this.fromSettings(settings);
    if (cfg.provider !== 'none') return cfg;

    // Fallback: SMTP from environment variables (older deployments).
    const host = this.config.get<string>('mail.host');
    if (!host) return cfg;
    return {
      provider: 'smtp',
      from: this.config.get<string>('mail.from') ?? `no-reply@${host}`,
      replyTo: null,
      smtp: {
        host,
        port: this.config.get<number>('mail.port') ?? 587,
        secure: this.config.get<boolean>('mail.secure') ?? false,
        user: this.config.get<string>('mail.user') ?? null,
        pass: this.config.get<string>('mail.pass') ?? null,
      },
    };
  }

  private fromSettings(s: EmailSettings): ResolvedConfig {
    const none: ResolvedConfig = { provider: 'none', from: '', replyTo: null };
    const fromEmail = s.fromEmail ?? s.smtpUser;
    const from =
      fromEmail && this.isValidEmail(fromEmail)
        ? `"${s.fromName.replace(/["\r\n]/g, '')}" <${fromEmail}>`
        : '';

    if (s.provider === 'smtp') {
      if (!s.smtpHost || !from) return none;
      return {
        provider: 'smtp',
        from,
        replyTo: s.replyTo,
        smtp: {
          host: s.smtpHost,
          port: s.smtpPort,
          secure: s.smtpSecure,
          user: s.smtpUser,
          pass: s.smtpPass,
        },
      };
    }
    if (s.provider === 'resend') {
      if (!s.resendApiKey || !from) return none;
      return {
        provider: 'resend',
        from,
        replyTo: s.replyTo,
        resendApiKey: s.resendApiKey,
      };
    }
    return none;
  }
}

function escapeAttr(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );
}
