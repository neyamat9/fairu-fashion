import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/mail';
import { SettingsService } from '../../common/settings';

const GENERIC_MESSAGE =
  'If an account exists for this email, a password reset link has been sent.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mail: MailService,
    private settings: SettingsService,
  ) {}

  // Always returns the same message so the endpoint cannot be used to find
  // out which emails are registered.
  async requestReset(rawEmail: string, opts: ResetFlow = {}) {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    // Admin links only for the admin account and go to the dashboard; the
    // storefront flow never touches admin accounts.
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      isAdminRole(user.role) !== !!opts.admin
    ) {
      return { success: true, message: GENERIC_MESSAGE };
    }

    // Only the newest link should work.
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const token = randomBytes(32).toString('hex');
    const ttlMinutes =
      this.config.get<number>('passwordReset.tokenTtlMinutes') ?? 30;

    // Only a hash is stored, so a leaked database row cannot be used to reset.
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      },
    });

    const frontendUrl = (
      this.config.get<string>(
        opts.admin ? 'frontend.adminUrl' : 'frontend.url',
      ) ?? ''
    ).replace(/\/$/, '');
    const path =
      this.config.get<string>(
        opts.admin
          ? 'frontend.adminResetPasswordPath'
          : 'frontend.resetPasswordPath',
      ) ?? '/reset-password';
    const link = `${frontendUrl}${path}?token=${token}`;
    const { storeName } = await this.settings.get('site');

    await this.mail.send({
      to: user.email,
      subject: `Reset your ${storeName} password`,
      text:
        `Hi ${user.name},\n\n` +
        `We received a request to reset your ${storeName} password. ` +
        `Open this link to choose a new one (valid for ${ttlMinutes} minutes):\n\n${link}\n\n` +
        `If you didn't request this, you can ignore this email.`,
      html:
        `<p>Hi ${escapeHtml(user.name)},</p>` +
        `<p>We received a request to reset your ${escapeHtml(storeName)} password. ` +
        `Click the button below to choose a new one. The link is valid for ${ttlMinutes} minutes.</p>` +
        `<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>` +
        `<p style="color:#666;font-size:13px">If you didn't request this, you can ignore this email.</p>`,
    });

    this.logger.log(`Password reset requested for user ${user.id}`);
    return { success: true, message: GENERIC_MESSAGE };
  }

  async verifyToken(token: string, opts: ResetFlow = {}) {
    const record = await this.findValidToken(token, opts);
    return { valid: !!record };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    opts: ResetFlow = {},
  ) {
    const record = await this.findValidToken(token, opts);
    if (!record) {
      throw new BadRequestException(
        'This reset link is invalid or has expired',
      );
    }

    if (await argon2.verify(record.user.passwordHash, newPassword)) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordHistory.create({
        data: { userId: record.userId, passwordHash: record.user.passwordHash },
      }),
      // Clearing the refresh token logs the user out on every device.
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, refreshTokenHash: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      }),
    ]);

    return {
      success: true,
      message: 'Password has been reset. Please log in with your new password.',
    };
  }

  private async findValidToken(token: string, opts: ResetFlow = {}) {
    if (!token) return null;
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashToken(token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) return null;
    if (record.user.status !== 'ACTIVE') return null;
    if (isAdminRole(record.user.role) !== !!opts.admin) return null;
    return record;
  }
}

// 'admin' = the dashboard flow, otherwise the storefront flow
export interface ResetFlow {
  admin?: boolean;
}

function isAdminRole(role: string) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );
}
