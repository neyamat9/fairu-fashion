import { SiteSettings } from '../settings';

// Escapes text for safe use inside HTML (all user/admin-provided values in
// emails and invoices go through this).
export function escapeHtml(
  value: string | number | boolean | null | undefined,
): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  );
}

export function formatMoney(amount: unknown, symbol = '৳') {
  const n = Number(amount ?? 0);
  return `${symbol}${n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// Wraps email body HTML in a simple, client-safe layout (inline styles only,
// table-based so it renders in Gmail/Outlook).
export function renderEmailLayout(
  site: SiteSettings,
  opts: { title: string; bodyHtml: string; footerHtml?: string },
) {
  const logo = site.logoUrl
    ? `<img src="${escapeHtml(site.logoUrl)}" alt="${escapeHtml(site.storeName)}" style="max-height:40px;border:0">`
    : `<span style="font-size:20px;font-weight:700;color:#111">${escapeHtml(site.storeName)}</span>`;
  const contact = [
    site.hotline && `Hotline: ${site.hotline}`,
    site.contactEmail,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' · ');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="padding:20px 24px;border-bottom:1px solid #eee">${logo}</td></tr>
<tr><td style="padding:24px;font-size:14px;line-height:1.6">${opts.bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;background:#fafafa;font-size:12px;color:#666;border-top:1px solid #eee">${opts.footerHtml ?? ''}${contact ? `<div>${contact}</div>` : ''}<div>&copy; ${new Date().getFullYear()} ${escapeHtml(site.storeName)}</div></td></tr>
</table></td></tr></table></body></html>`;
}
