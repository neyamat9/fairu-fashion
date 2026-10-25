import type { CheckoutSummary } from "@/lib/services/checkout.service";
import type { SiteSettings } from "@/lib/services/site.service";

/**
 * An instant guess of the delivery charge for a district, from the shop's public shipping settings
 * (one rate everywhere, or inside / outside Dhaka). Whether delivery is free (cart total reaching the free-shipping amount,
 * or every product marked free shipping) does not depend on the district, so it is carried over from the last server answer.
 * The real answer from the server replaces this a moment later, so it is only ever shown briefly.
 * Returns null when a guess would be unreliable (no settings or summary yet, or a coupon that discounts shipping).
 */
export function estimateForDistrict(summary: CheckoutSummary | null, settings: SiteSettings | null, district: string): CheckoutSummary | null {
  if (!summary || !settings || !district) return null;
  const sh = settings.shipping;
  if (summary.coupon?.applied && summary.coupon.shippingDiscount > 0) return null;
  // free by cart total / product flags (and a rate that is not simply 0) → stays free in every district
  const wasFreeByRule = summary.shipping.isFree && summary.shipping.baseRate > 0;
  if (summary.shipping.isFree && !wasFreeByRule) return null;

  const inside = sh.insideDhakaCities.some((c) => c.trim().toLowerCase() === district.trim().toLowerCase());
  const zone = sh.mode === "GLOBAL" ? "GLOBAL" : inside ? "INSIDE_DHAKA" : "OUTSIDE_DHAKA";
  const opt = sh.options.find((o) => o.zone === zone);
  if (!opt) return null;

  const cost = wasFreeByRule ? 0 : opt.rate;
  return {
    ...summary,
    shipping: { ...summary.shipping, zone, zoneLabel: opt.label, baseRate: opt.rate, cost, isFree: cost === 0, estimatedMinDays: opt.estimatedMinDays, estimatedMaxDays: opt.estimatedMaxDays },
    shippingCost: cost,
    total: Math.round((summary.total - summary.shippingCost + cost) * 100) / 100,
  };
}
