import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../common/settings';
import { MailService, escapeHtml, renderEmailLayout } from '../../common/mail';

const SUBSCRIBED_MESSAGE = 'Thanks for subscribing!';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  // Idempotent: subscribing twice gives the same answer, so the endpoint
  // does not reveal whether an email is already on the list.
  async subscribe(email: string, source?: string, userId?: string) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    let subscriber = existing;
    let isNew = false;
    if (!existing) {
      try {
        subscriber = await this.prisma.newsletterSubscriber.create({
          data: { email, source, userId, unsubscribeToken: newToken() },
        });
        isNew = true;
      } catch (error) {
        // Two requests raced to create the same email: already subscribed.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return { success: true, message: SUBSCRIBED_MESSAGE };
        }
        throw error;
      }
    } else if (existing.status === 'UNSUBSCRIBED') {
      subscriber = await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: 'SUBSCRIBED',
          subscribedAt: new Date(),
          unsubscribedAt: null,
          unsubscribeToken: newToken(),
          ...(userId && !existing.userId ? { userId } : {}),
        },
      });
      isNew = true;
    }

    if (userId) {
      await this.prisma.user.updateMany({
        where: { id: userId, email: { equals: email, mode: 'insensitive' } },
        data: { newsletter: true },
      });
    }

    if (isNew && subscriber) {
      void this.sendWelcome(subscriber.email, subscriber.unsubscribeToken);
    }
    return { success: true, message: SUBSCRIBED_MESSAGE };
  }

  async unsubscribe(token: string) {
    const sub = await this.prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });
    if (sub && sub.status === 'SUBSCRIBED') {
      await this.prisma.newsletterSubscriber.update({
        where: { id: sub.id },
        data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
      });
      await this.prisma.user.updateMany({
        where: { email: { equals: sub.email, mode: 'insensitive' } },
        data: { newsletter: false },
      });
    }
    // Same answer for unknown tokens: nothing to enumerate.
    return {
      success: true,
      message: 'You have been unsubscribed from our newsletter.',
    };
  }

  private async sendWelcome(email: string, token: string) {
    try {
      const settings = await this.settings.get('email');
      if (!settings.sendNewsletterWelcome) return;
      const site = await this.settings.get('site');
      const base = (this.config.get<string>('frontend.url') ?? '').replace(
        /\/$/,
        '',
      );
      const unsubscribe = `${base}/newsletter/unsubscribe?token=${token}`;
      const subject = `Welcome to the ${site.storeName} newsletter`;
      await this.mail.send({
        to: email,
        subject,
        text: `Thanks for subscribing to ${site.storeName}! You'll be the first to hear about new collections, dresses and exclusive offers.\n\nUnsubscribe: ${unsubscribe}`,
        html: renderEmailLayout(site, {
          title: subject,
          bodyHtml: `<h2 style="margin:0 0 12px;font-size:20px">You're subscribed!</h2><p>Thanks for subscribing to ${escapeHtml(site.storeName)}. You'll be the first to hear about new arrivals, stylish dresses and exclusive offers.</p>`,
          footerHtml: `<div><a href="${escapeHtml(unsubscribe)}" style="color:#666">Unsubscribe</a></div>`,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Newsletter welcome email failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function newToken() {
  return randomBytes(24).toString('hex');
}
