import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings';
import { MailService, escapeHtml, renderEmailLayout } from '../mail';
import { NotificationsService } from './notifications.service';
import { AdminFeedService } from '../admin-feed/admin-feed.service';

const ticketInclude = {
  submittedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.SupportTicketInclude;

type Ticket = Prisma.SupportTicketGetPayload<{ include: typeof ticketInclude }>;

const STATUS_TEXT: Record<string, string> = {
  RESOLVED: 'Your support ticket has been marked as resolved.',
  CLOSED: 'Your support ticket has been closed.',
  IN_PROGRESS: 'We are working on your support ticket.',
  OPEN: 'Your support ticket has been re-opened.',
};

// Support ticket notifications: the admin alert for new tickets and customer
// replies, and the customer's in-app notification + email for staff replies
// and status changes. Methods never throw and are safe to call without
// awaiting.
@Injectable()
export class TicketNotifierService {
  private readonly logger = new Logger(TicketNotifierService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private mail: MailService,
    private notifications: NotificationsService,
    private config: ConfigService,
    private adminFeed: AdminFeedService,
  ) {}

  // A customer opened a ticket or replied: alert the shop.
  customerWrote(ticketId: string, messageText: string, isNew: boolean) {
    return this.safely('customerWrote', async () => {
      const t = await this.load(ticketId);
      if (t) {
        await this.adminFeed.notify({
          type: isNew ? 'NEW_TICKET' : 'TICKET_REPLY',
          title:
            `${isNew ? 'New support ticket' : 'Customer replied'} ${t.ticketNumber ?? ''}`.trim(),
          body: `${t.submittedBy.name}: ${t.subject}`,
          entityType: 'ticket',
          entityId: t.id,
          data: { ticketNumber: t.ticketNumber },
        });
      }
      const email = await this.settings.get('email');
      if (!email.notifyAdminSupportTicket || !email.adminNotificationEmail) {
        return;
      }
      const ticket = await this.load(ticketId);
      if (!ticket) return;
      const site = await this.settings.get('site');
      const subject =
        `${isNew ? 'New support ticket' : 'Customer replied'} ${ticket.ticketNumber ?? ''}: ${ticket.subject}`.trim();
      const who = `${ticket.submittedBy.name} <${ticket.submittedBy.email}>`;

      await this.mail.send({
        to: email.adminNotificationEmail,
        replyTo: ticket.submittedBy.email,
        subject,
        text: `${who}\n${ticket.ticketNumber ?? ''} — ${ticket.subject}\n\n${messageText}`,
        html: renderEmailLayout(site, {
          title: subject,
          bodyHtml: `<h2 style="margin:0 0 12px;font-size:18px">${isNew ? 'New support ticket' : 'Customer replied'}</h2>
<p style="margin:0 0 4px"><strong>${escapeHtml(ticket.ticketNumber)}</strong> — ${escapeHtml(ticket.subject)}</p>
<p style="margin:0 0 12px;color:#666">${escapeHtml(who)} · ${escapeHtml(ticket.category)} · ${escapeHtml(ticket.priority)}</p>
<div style="white-space:pre-wrap;padding:12px;background:#fafafa;border-radius:6px">${escapeHtml(messageText)}</div>`,
        }),
      });
    });
  }

  // Staff replied to the customer.
  staffReplied(ticketId: string, messageText: string) {
    return this.safely('staffReplied', async () => {
      const ticket = await this.load(ticketId);
      if (!ticket) return;
      await this.tellCustomer(ticket, {
        title: `Reply to your ticket ${ticket.ticketNumber ?? ''}`.trim(),
        body: messageText,
        heading: 'We replied to your support ticket',
        quote: messageText,
      });
    });
  }

  // Resolved / closed / re-opened by staff.
  statusChanged(ticketId: string, status: string) {
    return this.safely('statusChanged', async () => {
      const text = STATUS_TEXT[status];
      if (!text) return;
      const ticket = await this.load(ticketId);
      if (!ticket) return;
      await this.tellCustomer(ticket, {
        title: `Ticket ${ticket.ticketNumber ?? ''} update`.trim(),
        body: text,
        heading: 'Support ticket update',
      });
    });
  }

  private async tellCustomer(
    ticket: Ticket,
    msg: { title: string; body: string; heading: string; quote?: string },
  ) {
    const user = ticket.submittedBy;
    await this.notifications.notifyInApp(user.id, {
      type: 'TICKET_UPDATED',
      title: msg.title,
      body: msg.body.length > 300 ? `${msg.body.slice(0, 297)}...` : msg.body,
      data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
    });

    const email = await this.settings.get('email');
    if (!email.notifyCustomerTicketReply) return;
    if (
      !(await this.notifications.isEnabled(user.id, 'TICKET_UPDATED', 'email'))
    ) {
      return;
    }

    const site = await this.settings.get('site');
    const base = (this.config.get<string>('frontend.url') ?? '').replace(
      /\/$/,
      '',
    );
    const link = `${base}/account/support/${ticket.id}`;
    const bodyHtml = `
<h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(msg.heading)}</h2>
<p style="margin:0 0 12px">Hi ${escapeHtml(user.name)},</p>
<p style="margin:0 0 12px"><strong>${escapeHtml(ticket.ticketNumber)}</strong> — ${escapeHtml(ticket.subject)}</p>
${
  msg.quote
    ? `<div style="white-space:pre-wrap;padding:12px;background:#fafafa;border-left:3px solid #111;border-radius:4px;margin:0 0 16px">${escapeHtml(msg.quote)}</div>`
    : `<p style="margin:0 0 16px">${escapeHtml(msg.body)}</p>`
}
<p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">View ticket</a></p>`;

    await this.mail.send({
      to: user.email,
      subject: msg.title,
      text: `Hi ${user.name},\n\n${ticket.ticketNumber ?? ''} — ${ticket.subject}\n\n${msg.quote ?? msg.body}\n\nView ticket: ${link}`,
      html: renderEmailLayout(site, { title: msg.title, bodyHtml }),
    });
  }

  private load(ticketId: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: ticketInclude,
    });
  }

  private async safely(label: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (error) {
      this.logger.error(
        `${label} notification failed: ${error instanceof Error ? error.stack : String(error)}`,
      );
    }
  }
}
