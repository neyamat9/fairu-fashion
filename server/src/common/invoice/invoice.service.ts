import { PAYMENT_LABEL } from '../settings/settings.types';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService, SiteSettings } from '../settings';
import { escapeHtml, formatMoney } from '../mail/email-layout';

const invoiceInclude = {
  items: {
    include: { product: { select: { warrantyInfo: true, productCode: true } } },
  },
  shippingAddress: true,
  user: { select: { name: true, email: true, phone: true } },
} satisfies Prisma.OrderInclude;

export interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  issuedAt: Date;
  orderDate: Date;
  status: string;
  store: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    hotline: string | null;
    email: string | null;
  };
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string;
  };
  items: {
    name: string;
    variant: string | null;
    sku: string | null;
    warranty: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totals: {
    subtotal: number;
    discount: number;
    couponCode: string | null;
    shipping: number;
    tax: number;
    total: number;
    paid: number;
    due: number;
  };
  payment: {
    method: string;
    status: string;
    bkashTransactionId: string | null;
  };
  currencySymbol: string;
}

// Builds invoices for orders: structured JSON for the storefront, or a
// print-ready HTML page (browser "Print → Save as PDF" keeps Bangla text
// intact, which embedded PDF fonts would not).
@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async build(where: Prisma.OrderWhereInput): Promise<InvoiceData> {
    const order = await this.prisma.order.findFirst({
      where,
      include: invoiceInclude,
    });
    if (!order) throw new NotFoundException('Order not found');

    const site = await this.settings.get('site');
    const addr = order.shippingAddress;
    const address = addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode]
          .filter(Boolean)
          .join(', ')
      : '';

    return {
      invoiceNumber: order.orderNumber,
      orderId: order.id,
      issuedAt: new Date(),
      orderDate: order.placedAt,
      status: order.status,
      store: {
        name: site.storeName,
        logoUrl: site.logoUrl,
        address: site.address,
        hotline: site.hotline,
        email: site.contactEmail,
      },
      customer: {
        name: addr?.fullName ?? order.user?.name ?? order.guestName ?? '',
        phone: addr?.phone ?? order.user?.phone ?? order.guestPhone ?? null,
        email: order.user?.email ?? order.guestEmail ?? null,
        address,
      },
      items: order.items.map((i) => ({
        name: i.productName,
        variant: i.variantName,
        sku: i.variantSku ?? i.product?.productCode ?? null,
        warranty: i.product?.warrantyInfo ?? null,
        quantity: i.quantity,
        unitPrice: Number(i.price),
        total: Number(i.total),
      })),
      totals: {
        subtotal: Number(order.subtotal),
        discount: Number(order.discountAmount),
        couponCode: order.couponCode,
        shipping: Number(order.shippingCost),
        tax: Number(order.taxAmount),
        total: Number(order.total),
        paid: Number(order.paidAmount),
        due: Number(order.dueAmount),
      },
      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus,
        bkashTransactionId: order.bkashTransactionId,
      },
      currencySymbol: site.currencySymbol,
    };
  }

  // Sends the invoice as JSON (wrapped like every API response) or HTML.
  async respond(
    res: Response,
    where: Prisma.OrderWhereInput,
    format: string | undefined,
  ) {
    const data = await this.build(where);
    if (format === 'json') return data;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="invoice-${data.invoiceNumber}.html"`,
    );
    // The page only needs its own inline styles/script and https images.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https: data:",
    );
    res.setHeader('Cache-Control', 'private, no-store');
    const site = await this.settings.get('site');
    return this.renderHtml(data, site);
  }

  renderHtml(d: InvoiceData, site: SiteSettings): string {
    const money = (n: number) => escapeHtml(formatMoney(n, d.currencySymbol));
    const date = (v: Date) =>
      escapeHtml(
        new Date(v).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Dhaka',
        }),
      );
    const rows = d.items
      .map(
        (i, idx) => `<tr>
<td>${idx + 1}</td>
<td><strong>${escapeHtml(i.name)}</strong>${i.variant ? `<div class="muted">${escapeHtml(i.variant)}</div>` : ''}${i.sku ? `<div class="muted">SKU: ${escapeHtml(i.sku)}</div>` : ''}</td>
<td>${i.warranty ? escapeHtml(i.warranty) : '—'}</td>
<td class="num">${i.quantity}</td>
<td class="num">${money(i.unitPrice)}</td>
<td class="num">${money(i.total)}</td></tr>`,
      )
      .join('');
    const line = (label: string, value: string, cls = '') =>
      `<tr class="${cls}"><td>${label}</td><td class="num">${value}</td></tr>`;
    const paymentLabel = PAYMENT_LABEL[d.payment.method] ?? d.payment.method;
    const logo = d.store.logoUrl
      ? `<img src="${escapeHtml(d.store.logoUrl)}" alt="" class="logo">`
      : '';

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${escapeHtml(d.invoiceNumber)} — ${escapeHtml(d.store.name)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f4f4f5;font:14px/1.5 Arial,"Noto Sans Bengali","Hind Siliguri",sans-serif;color:#111}
.page{max-width:820px;margin:24px auto;background:#fff;padding:40px;border-radius:8px}
.top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}.logo{max-height:48px;display:block;margin-bottom:8px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:1px}.muted{color:#666;font-size:12px}
.grid{display:flex;gap:24px;margin:28px 0;flex-wrap:wrap}.grid>div{flex:1;min-width:220px}
h3{font-size:12px;text-transform:uppercase;color:#666;margin:0 0 6px;letter-spacing:.5px}
table{width:100%;border-collapse:collapse}th{text-align:left;font-size:12px;text-transform:uppercase;color:#666;border-bottom:2px solid #111;padding:8px 6px}
td{padding:10px 6px;border-bottom:1px solid #eee;vertical-align:top}.num{text-align:right;white-space:nowrap}
.totals{margin-left:auto;width:300px;margin-top:16px}.totals td{border:0;padding:4px 6px}.totals .grand td{font-size:16px;font-weight:700;border-top:2px solid #111;padding-top:8px}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;background:#eee}.paid{background:#dcfce7;color:#166534}.due{background:#fef3c7;color:#92400e}
.note{margin-top:28px;font-size:12px;color:#555;border-top:1px solid #eee;padding-top:12px}
.bar{max-width:820px;margin:16px auto 0;text-align:right}.bar button{padding:8px 16px;border:0;border-radius:6px;background:#111;color:#fff;cursor:pointer;font-size:14px}
@media print{body{background:#fff}.page{margin:0;padding:0;border-radius:0;max-width:none}.bar{display:none}}
@media (max-width:600px){.page{padding:20px;margin:0}.totals{width:100%}}
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print / Save as PDF</button></div>
<div class="page">
<div class="top">
<div>${logo}<strong style="font-size:18px">${escapeHtml(d.store.name)}</strong>
${d.store.address ? `<div class="muted">${escapeHtml(d.store.address)}</div>` : ''}
<div class="muted">${[d.store.hotline, d.store.email].filter(Boolean).map(escapeHtml).join(' · ')}</div></div>
<div style="text-align:right"><h1>INVOICE</h1>
<div><strong>#${escapeHtml(d.invoiceNumber)}</strong></div>
<div class="muted">Order date: ${date(d.orderDate)}</div>
<div class="muted">Issued: ${date(d.issuedAt)}</div></div>
</div>
<div class="grid">
<div><h3>Bill / Ship to</h3><strong>${escapeHtml(d.customer.name)}</strong>
${d.customer.phone ? `<div>${escapeHtml(d.customer.phone)}</div>` : ''}
${d.customer.email ? `<div>${escapeHtml(d.customer.email)}</div>` : ''}
<div>${escapeHtml(d.customer.address)}</div></div>
<div><h3>Payment</h3><div>${paymentLabel}</div>
<div><span class="badge ${d.payment.status === 'PAID' ? 'paid' : 'due'}">${escapeHtml(d.payment.status)}</span></div>
${d.payment.bkashTransactionId ? `<div class="muted">${escapeHtml(paymentLabel)} TrxID: ${escapeHtml(d.payment.bkashTransactionId)}</div>` : ''}
<div class="muted">Order status: ${escapeHtml(d.status)}</div></div>
</div>
<table><thead><tr><th>#</th><th>Item</th><th>Warranty</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
<tbody>${rows}</tbody></table>
<table class="totals">
${line('Subtotal', money(d.totals.subtotal))}
${d.totals.discount > 0 ? line(`Discount${d.totals.couponCode ? ` (${escapeHtml(d.totals.couponCode)})` : ''}`, `-${money(d.totals.discount)}`) : ''}
${line('Delivery charge', d.totals.shipping > 0 ? money(d.totals.shipping) : 'Free')}
${d.totals.tax > 0 ? line('Tax', money(d.totals.tax)) : ''}
${line('Total', money(d.totals.total), 'grand')}
${line('Paid', money(d.totals.paid))}
${line('Amount due', money(d.totals.due))}
</table>
<div class="note">Please keep this invoice for warranty claims. Warranty is provided as stated for each item${site.hotline ? `; for support call ${escapeHtml(site.hotline)}` : ''}.<br>This is a computer-generated invoice and does not require a signature.</div>
</div></body></html>`;
  }
}
