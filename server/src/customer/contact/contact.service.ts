import { Injectable, Logger } from '@nestjs/common';
import { AdminFeedService } from '../../common/admin-feed';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../common/settings';
import { MailService, escapeHtml, renderEmailLayout } from '../../common/mail';
import { ContactDto } from './contact.dto';

const THANKS = {
  success: true,
  message: 'Thanks! We received your message and will get back to you soon.',
};

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private mail: MailService,
    private adminFeed: AdminFeedService,
  ) {}

  async submit(
    dto: ContactDto,
    meta: { userId?: string; ip?: string; userAgent?: string },
  ) {
    // Spam bot filled the hidden field: pretend it worked, store nothing.
    if (dto.website?.trim()) {
      this.logger.warn(
        `Contact form honeypot triggered from ${meta.ip ?? '?'}`,
      );
      return THANKS;
    }

    const saved = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        subject: dto.subject,
        message: dto.message,
        userId: meta.userId ?? null,
        ipAddress: meta.ip?.slice(0, 64) ?? null,
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
      },
    });

    void this.adminFeed.notify({
      type: 'CONTACT_MESSAGE',
      title: `Contact message: ${dto.subject}`,
      body: `${dto.name} <${dto.email}>`,
      entityType: 'contact-message',
      entityId: saved.id,
    });
    void this.alertAdmin(saved.id);
    // No auto-reply to the sender: it would let anyone make the shop send
    // email to arbitrary addresses.
    return THANKS;
  }

  private async alertAdmin(id: string) {
    try {
      const email = await this.settings.get('email');
      if (!email.notifyAdminContactMessage || !email.adminNotificationEmail) {
        return;
      }
      const msg = await this.prisma.contactMessage.findUnique({
        where: { id },
      });
      if (!msg) return;
      const site = await this.settings.get('site');
      const subject = `Contact form: ${msg.subject}`;
      await this.mail.send({
        to: email.adminNotificationEmail,
        replyTo: msg.email,
        subject,
        text: `From: ${msg.name} <${msg.email}>${msg.phone ? `\nPhone: ${msg.phone}` : ''}\n\n${msg.message}`,
        html: renderEmailLayout(site, {
          title: subject,
          bodyHtml: `<h2 style="margin:0 0 12px;font-size:18px">New contact message</h2>
<p style="margin:0 0 4px"><strong>${escapeHtml(msg.name)}</strong> &lt;${escapeHtml(msg.email)}&gt;</p>
${msg.phone ? `<p style="margin:0 0 4px">Phone: ${escapeHtml(msg.phone)}</p>` : ''}
<p style="margin:0 0 12px">Subject: ${escapeHtml(msg.subject)}</p>
<div style="white-space:pre-wrap;padding:12px;background:#fafafa;border-radius:6px">${escapeHtml(msg.message)}</div>
<p style="color:#666;font-size:12px">Reply to this email to answer the customer, or reply from the admin dashboard.</p>`,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Contact admin alert failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
