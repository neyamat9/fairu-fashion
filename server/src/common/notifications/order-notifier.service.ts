import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  OrderStatus,
  Prisma,
  ReturnStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings';
import { isMobileBanking, PAYMENT_LABEL } from '../settings/settings.types';
import {
  MailService,
  escapeHtml,
  formatMoney,
  renderEmailLayout,
} from '../mail';
import { NotificationsService } from './notifications.service';
import { AdminFeedService } from '../admin-feed/admin-feed.service';

const orderInclude = {
  items: true,
  shippingAddress: true,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude;

type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

// What the customer sees for each status (in-app + email).
const STATUS_COPY: Partial<
  Record<OrderStatus, { type: NotificationType; title: string; body: string }>
> = {
  CONFIRMED: {
    type: 'ORDER_CONFIRMED',
    title: 'Order confirmed',
    body: 'Your order has been confirmed and will be packed soon.',
  },
  PROCESSING: {
    type: 'ORDER_UPDATED',
    title: 'Order is being processed',
    body: 'We are packing your order.',
  },
  SHIPPED: {
    type: 'ORDER_SHIPPED',
    title: 'Order shipped',
    body: 'Your order has been handed to the courier.',
  },
  IN_TRANSIT: {
    type: 'ORDER_SHIPPED',
    title: 'Order in transit',
    body: 'Your order is on the way.',
  },
  OUT_FOR_DELIVERY: {
    type: 'ORDER_SHIPPED',
    title: 'Out for delivery',
    body: 'Your order will be delivered today. Please keep your phone reachable.',
  },
  DELIVERED: {
    type: 'ORDER_DELIVERED',
    title: 'Order delivered',
    body: 'Your order has been delivered. Thank you for shopping with us!',
  },
  CANCELLED: {
    type: 'ORDER_CANCELLED',
    title: 'Order cancelled',
    body: 'Your order has been cancelled.',
  },
  ON_HOLD: {
    type: 'ORDER_UPDATED',
    title: 'Order on hold',
    body: 'Your order is on hold. We will contact you shortly.',
  },
  RETURNED: {
    type: 'ORDER_UPDATED',
    title: 'Order returned',
    body: 'Your order has been marked as returned.',
  },
  REFUNDED: {
    type: 'ORDER_UPDATED',
    title: 'Order refunded',
    body: 'Your refund has been processed.',
  },
};

const RETURN_COPY: Partial<Record<ReturnStatus, string>> = {
  APPROVED:
    'Your return request has been approved. We will arrange the pickup.',
  REJECTED: 'Your return request was not approved.',
  PICKED_UP: 'Your returned item has been picked up.',
  RECEIVED: 'We have received your returned item.',
  REFUNDED: 'Your refund has been processed.',
  REPLACED: 'Your replacement has been arranged.',
};

// Sends order-related notifications: in-app (registered customers) and email
// (customers and guests, per the admin email settings and the customer's own
// preferences), plus the admin "new order" alert.
//
// Every public method is safe to call without awaiting: failures are logged
// and never propagate to the request that triggered them.
@Injectable()
export class OrderNotifierService {
  private readonly logger = new Logger(OrderNotifierService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private mail: MailService,
    private notifications: NotificationsService,
    private config: ConfigService,
    private adminFeed: AdminFeedService,
  ) {}

  // skipAdminEmail: the shop created the order itself (phone order).
  orderPlaced(orderId: string, opts: { skipAdminEmail?: boolean } = {}) {
    return this.safely('orderPlaced', async () => {
      const order = await this.load(orderId);
      if (!order) return;
      if (!opts.skipAdminEmail) {
        await this.adminFeed.notify({
          type: 'NEW_ORDER',
          title: `New order ${order.orderNumber}`,
          body: `${order.shippingAddress?.fullName ?? order.user?.name ?? order.guestName ?? 'A customer'} ordered ${order.items.length} item(s), total ${formatMoney(order.total)} (${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}).`,
          entityType: 'order',
          entityId: order.id,
          data: { orderNumber: order.orderNumber },
        });
        if (isMobileBanking(order.paymentMethod)) {
          await this.adminFeed.notify({
            type: 'PAYMENT_PENDING',
            title: `${PAYMENT_LABEL[order.paymentMethod]} payment to verify: ${order.orderNumber}`,
            body: `Transaction ${order.bkashTransactionId ?? '—'} from ${order.bkashSenderNumber ?? '—'} for ${formatMoney(order.total)}.`,
            entityType: 'order',
            entityId: order.id,
            data: { orderNumber: order.orderNumber },
          });
        }
      }
      const email = await this.settings.get('email');
      const title = `Order ${order.orderNumber} received`;
      const body = isMobileBanking(order.paymentMethod)
        ? `We received your order. Your ${PAYMENT_LABEL[order.paymentMethod]} payment will be verified shortly.`
        : 'We received your order and will confirm it soon.';

      if (order.userId) {
        await this.notifications.notifyInApp(order.userId, {
          type: 'ORDER_PLACED',
          title,
          body,
          data: this.data(order),
        });
      }

      if (email.notifyCustomerOrderPlaced) {
        await this.emailCustomer(order, 'ORDER_PLACED', {
          subject: `Order confirmation — ${order.orderNumber}`,
          heading: 'Thank you for your order!',
          intro: body,
          includeItems: true,
        });
      }

      if (
        !opts.skipAdminEmail &&
        email.notifyAdminNewOrder &&
        email.adminNotificationEmail
      ) {
        await this.emailAdminNewOrder(order, email.adminNotificationEmail);
      }
    });
  }

  orderStatusChanged(orderId: string, status: OrderStatus, note?: string) {
    return this.safely('orderStatusChanged', async () => {
      const copy = STATUS_COPY[status];
      if (!copy) return;
      const order = await this.load(orderId);
      if (!order) return;

      const extra =
        status === 'SHIPPED' && order.trackingNumber
          ? ` Tracking number: ${order.trackingNumber}.`
          : '';
      const body = `${copy.body}${extra}${note ? ` Note: ${note}` : ''}`;

      if (order.userId) {
        await this.notifications.notifyInApp(order.userId, {
          type: copy.type,
          title: `${copy.title} — ${order.orderNumber}`,
          body,
          data: { ...this.data(order), status },
        });
      }

      const email = await this.settings.get('email');
      if (email.notifyCustomerOrderStatus) {
        await this.emailCustomer(order, copy.type, {
          subject: `${copy.title} — ${order.orderNumber}`,
          heading: copy.title,
          intro: body,
          includeItems: status === 'DELIVERED' || status === 'CANCELLED',
        });
      }
    });
  }

  paymentUpdated(
    orderId: string,
    paymentStatus: 'PAID' | 'FAILED',
    note?: string,
  ) {
    return this.safely('paymentUpdated', async () => {
      const order = await this.load(orderId);
      if (!order) return;
      const type: NotificationType =
        paymentStatus === 'PAID' ? 'PAYMENT_RECEIVED' : 'PAYMENT_FAILED';
      const title =
        paymentStatus === 'PAID'
          ? 'Payment received'
          : 'Payment could not be verified';
      const body =
        paymentStatus === 'PAID'
          ? `We received your payment of ${formatMoney(order.total)}.`
          : `We could not verify your bKash payment${note ? `: ${note}` : '.'} Please contact us.`;

      if (order.userId) {
        await this.notifications.notifyInApp(order.userId, {
          type,
          title: `${title} — ${order.orderNumber}`,
          body,
          data: { ...this.data(order), paymentStatus },
        });
      }
      const email = await this.settings.get('email');
      if (email.notifyCustomerOrderStatus) {
        await this.emailCustomer(order, type, {
          subject: `${title} — ${order.orderNumber}`,
          heading: title,
          intro: body,
          includeItems: false,
        });
      }
    });
  }

  returnStatusChanged(
    returnId: string,
    status: ReturnStatus,
    note?: string | null,
  ) {
    return this.safely('returnStatusChanged', async () => {
      const text = RETURN_COPY[status];
      if (!text) return;
      const ret = await this.prisma.returnRequest.findUnique({
        where: { id: returnId },
        select: { id: true, userId: true, orderId: true },
      });
      if (!ret) return;
      const order = await this.load(ret.orderId);
      if (!order) return;
      const body = `${text}${note ? ` Note: ${note}` : ''}`;
      const title = `Return update — ${order.orderNumber}`;

      await this.notifications.notifyInApp(ret.userId, {
        type: 'RETURN_UPDATED',
        title,
        body,
        data: { returnId: ret.id, orderId: order.id, status },
      });
      const email = await this.settings.get('email');
      if (email.notifyCustomerOrderStatus) {
        await this.emailCustomer(order, 'RETURN_UPDATED', {
          subject: title,
          heading: 'Return update',
          intro: body,
          includeItems: false,
        });
      }
    });
  }

  // ---------------------------------------------------------------------

  private async emailCustomer(
    order: FullOrder,
    type: NotificationType,
    opts: {
      subject: string;
      heading: string;
      intro: string;
      includeItems: boolean;
    },
  ) {
    const to = order.user?.email ?? order.guestEmail;
    if (!to) return;
    if (
      order.userId &&
      !(await this.notifications.isEnabled(order.userId, type, 'email'))
    ) {
      return;
    }

    const site = await this.settings.get('site');
    const name =
      order.user?.name ??
      order.guestName ??
      order.shippingAddress?.fullName ??
      '';
    const link = this.orderLink(order);
    const itemsHtml = opts.includeItems
      ? this.itemsTable(order, site.currencySymbol)
      : '';
    const payment = this.paymentInstructions(order);

    const bodyHtml = `
<h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(opts.heading)}</h2>
<p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 16px">${escapeHtml(opts.intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:14px">
<tr><td style="padding:2px 12px 2px 0;color:#666">Order number</td><td><strong>${escapeHtml(order.orderNumber)}</strong></td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#666">Order total</td><td><strong>${formatMoney(order.total, site.currencySymbol)}</strong></td></tr>
<tr><td style="padding:2px 12px 2px 0;color:#666">Payment</td><td>${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod} (${escapeHtml(order.paymentStatus.toLowerCase())})</td></tr>
</table>
${payment.html}
${itemsHtml}
<p style="margin:20px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">View your order</a></p>`;

    const text = [
      `Hi ${name},`,
      '',
      opts.intro,
      '',
      `Order number: ${order.orderNumber}`,
      `Order total: ${formatMoney(order.total, site.currencySymbol)}`,
      payment.text,
      opts.includeItems
        ? order.items
            .map(
              (i) =>
                `- ${i.productName}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity}: ${formatMoney(i.total, site.currencySymbol)}`,
            )
            .join('\n')
        : '',
      '',
      `View your order: ${link}`,
    ]
      .filter((l) => l !== undefined)
      .join('\n');

    await this.mail.send({
      to,
      subject: opts.subject,
      html: renderEmailLayout(site, { title: opts.subject, bodyHtml }),
      text,
    });
  }

  private async emailAdminNewOrder(order: FullOrder, to: string) {
    const site = await this.settings.get('site');
    const customer = order.user
      ? `${order.user.name} <${order.user.email}>`
      : `${order.guestName ?? order.shippingAddress?.fullName ?? 'Guest'} (guest)`;
    const phone = order.shippingAddress?.phone ?? order.guestPhone ?? '';
    const subject = `New order ${order.orderNumber} — ${formatMoney(order.total, site.currencySymbol)}`;
    const bodyHtml = `
<h2 style="margin:0 0 12px;font-size:20px">New order received</h2>
<p style="margin:0 0 4px"><strong>${escapeHtml(order.orderNumber)}</strong> — ${formatMoney(order.total, site.currencySymbol)}</p>
<p style="margin:0 0 4px">Customer: ${escapeHtml(customer)}</p>
<p style="margin:0 0 4px">Phone: ${escapeHtml(phone)}</p>
<p style="margin:0 0 4px">Payment: ${isMobileBanking(order.paymentMethod) ? `${PAYMENT_LABEL[order.paymentMethod]} (TrxID ${escapeHtml(order.bkashTransactionId ?? '-')}, from ${escapeHtml(order.bkashSenderNumber ?? '-')})` : 'Cash on Delivery'}</p>
<p style="margin:0 0 12px">Delivery: ${escapeHtml(order.shippingAddress?.city ?? '')} (${escapeHtml(order.shippingZone ?? '')})</p>
${this.itemsTable(order, site.currencySymbol)}`;
    await this.mail.send({
      to,
      subject,
      html: renderEmailLayout(site, { title: subject, bodyHtml }),
      text:
        `New order ${order.orderNumber}\nTotal: ${formatMoney(order.total, site.currencySymbol)}\nCustomer: ${customer}\nPhone: ${phone}\n` +
        order.items.map((i) => `- ${i.productName} x${i.quantity}`).join('\n'),
    });
  }

  private itemsTable(order: FullOrder, symbol: string) {
    const rows = order.items
      .map(
        (i) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(i.productName)}${i.variantName ? `<div style="color:#666;font-size:12px">${escapeHtml(i.variantName)}</div>` : ''}</td>
<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${formatMoney(i.total, symbol)}</td></tr>`,
      )
      .join('');
    const line = (label: string, value: string, bold = false) =>
      `<tr><td colspan="2" style="padding:4px 0;text-align:right;color:#666">${label}</td><td style="padding:4px 0;text-align:right">${bold ? `<strong>${value}</strong>` : value}</td></tr>`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0">
<tr><th style="text-align:left;padding:6px 0;border-bottom:2px solid #111">Item</th><th style="padding:6px 8px;border-bottom:2px solid #111">Qty</th><th style="text-align:right;padding:6px 0;border-bottom:2px solid #111">Total</th></tr>
${rows}
${line('Subtotal', formatMoney(order.subtotal, symbol))}
${Number(order.discountAmount) > 0 ? line(`Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ''}`, `-${formatMoney(order.discountAmount, symbol)}`) : ''}
${line('Delivery', Number(order.shippingCost) > 0 ? formatMoney(order.shippingCost, symbol) : 'Free')}
${line('Total', formatMoney(order.total, symbol), true)}
</table>`;
  }

  private paymentInstructions(order: FullOrder) {
    if (
      !isMobileBanking(order.paymentMethod) ||
      order.paymentStatus !== 'PENDING'
    ) {
      return { html: '', text: '' };
    }
    const msg = `We will verify your ${PAYMENT_LABEL[order.paymentMethod]} payment (TrxID ${order.bkashTransactionId ?? '-'}) and confirm your order.`;
    return {
      html: `<p style="margin:0 0 16px;padding:10px 12px;background:#fdf2f8;border-radius:6px">${escapeHtml(msg)}</p>`,
      text: msg,
    };
  }

  private orderLink(order: FullOrder) {
    const base = (this.config.get<string>('frontend.url') ?? '').replace(
      /\/$/,
      '',
    );
    if (order.userId) return `${base}/orders/${order.id}`;
    const phone = order.shippingAddress?.phone ?? order.guestPhone ?? '';
    return `${base}/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(phone)}`;
  }

  private data(order: FullOrder) {
    return { orderId: order.id, orderNumber: order.orderNumber };
  }

  private load(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
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
