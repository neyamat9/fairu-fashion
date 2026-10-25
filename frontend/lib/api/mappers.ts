// Turns backend responses into the shapes the pages already use.
import type {
  Brand,
  Category,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PinnedSpec,
  Product,
  ProductBadge,
  ProductVariant,
  Question,
  Review,
  ShippingAddress,
  SpecGroup,
  User,
} from '../types/index';
import { assetUrl, PLACEHOLDER_IMAGE } from './client';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>;
const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// ── products ─────────────────────────────────────────────
const COLORS: Record<string, string> = {
  black: '#111111', white: '#F5F5F5', silver: '#C0C0C0', gray: '#9CA3AF', grey: '#9CA3AF', blue: '#2563EB', navy: '#053972',
  red: '#DC2626', green: '#16A34A', gold: '#D4A017', yellow: '#EAB308', orange: '#F99B10', pink: '#EC4899', purple: '#7C3AED',
  titanium: '#8D8D8D', graphite: '#4B5563', midnight: '#0B1B33', starlight: '#E8E2D5', rose: '#F4B6C2', brown: '#7C4A21', beige: '#D9C7A3',
};
const colorFor = (name: string) => {
  if (/^#[0-9a-f]{3,8}$/i.test(name)) return name;
  const key = name.toLowerCase().split(/[\s/-]+/).find((w) => COLORS[w]);
  return key ? COLORS[key] : '#9CA3AF';
};

function mapVariant(v: Raw, base: { price: number; originalPrice?: number }): ProductVariant {
  const names = [v.attribute1Name, v.attribute2Name, v.attribute3Name].filter(Boolean).map((s: string) => s.toLowerCase());
  const onlyColor = names.length === 1 && names[0].startsWith('colo');
  const type: ProductVariant['type'] = onlyColor ? 'color' : names.includes('ram') && names.length === 1 ? 'ram' : names.includes('storage') && names.length === 1 ? 'storage' : 'size';
  const label = v.name || [v.attribute1Value, v.attribute2Value, v.attribute3Value].filter(Boolean).join(' / ') || v.sku;
  return {
    id: v.id,
    label,
    type,
    colorHex: onlyColor ? colorFor(String(v.attribute1Value || label)) : undefined,
    price: v.price !== null && v.price !== undefined ? num(v.price) : base.price,
    originalPrice: base.originalPrice,
    stock: num(v.stock),
    sku: v.sku,
  };
}

const ICONS: [RegExp, PinnedSpec['icon']][] = [
  [/ram|memory/i, 'memory'], [/storage|rom|ssd|capacity/i, 'storage'], [/processor|cpu|chip|gpu/i, 'chip'], [/display|screen|resolution/i, 'display'],
  [/battery|power|watt|charging/i, 'power'], [/port|connector|usb|interface|network|connect/i, 'connector'], [/weight/i, 'weight'],
];
const iconFor = (name: string): PinnedSpec['icon'] => ICONS.find(([re]) => re.test(name))?.[1] ?? 'speed';

function parseBox(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v.trim()) {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.map(String);
    } catch {
      return v.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

// Descriptions may carry simple HTML; show them as text
const plain = (v: unknown) =>
  String(v ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Full product (detail page, product lists) — also accepts the slim "card" shape.
export function mapProduct(p: Raw): Product {
  const isCard = p.sellingPrice === undefined;
  const price = isCard ? num(p.price) : num(p.sellingPrice);
  const regular = num(p.regularPrice);
  const originalPrice = regular > price ? regular : undefined;
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : undefined;

  let images = (p.images ?? []).map((im: Raw, i: number) => ({
    id: im.id ?? `img-${i}`,
    url: assetUrl(im.url),
    alt: im.alt || p.name,
    isPrimary: im.isMain ?? i === 0,
  }));
  if (isCard) {
    images = [p.image, p.hoverImage].filter(Boolean).map((u: string, i: number) => ({ id: `img-${i}`, url: assetUrl(u), alt: p.name, isPrimary: i === 0 }));
  }
  if (images.length === 0) images = [{ id: 'img-0', url: PLACEHOLDER_IMAGE, alt: p.name, isPrimary: true }];

  const attributes: Raw[] = p.attributes ?? [];
  const specs: SpecGroup[] = (p.specifications ?? [])
    .filter((s: Raw) => s.items?.length)
    .map((s: Raw) => ({ groupName: s.title, items: s.items.map((i: Raw) => ({ key: i.key, value: i.value })) }));
  if (attributes.length) specs.unshift({ groupName: 'Key Features', items: attributes.map((a) => ({ key: a.name, value: a.value })) });

  const badges: ProductBadge[] = [];
  if (p.isNew) badges.push('NEW');
  if (p.isHot) badges.push('HOT');
  if (p.isBestSeller) badges.push('BEST SELLER');
  if (p.isLimitedStock) badges.push('LIMITED STOCK');

  const stock = num(p.stock);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription ?? '',
    description: plain(p.description),
    brand: p.brand?.slug ?? '',
    brandName: p.brand?.name ?? p.brandName ?? '',
    category: p.category?.slug ?? '',
    categoryName: p.category?.name ?? p.categoryName ?? '',
    subCategory: p.subCategory?.slug ?? '',
    subCategoryName: p.subCategory?.name ?? p.subCategoryName ?? '',
    productCode: p.productCode ?? '',
    price,
    originalPrice,
    discount,
    stock,
    images,
    variants: (p.variants ?? []).map((v: Raw) => mapVariant(v, { price, originalPrice })),
    specs,
    pinnedSpecs: attributes.slice(0, 4).map((a) => ({ icon: iconFor(a.name), label: a.name, value: a.value })),
    badges,
    soldLast24h: num(p.soldLast24h),
    purchasePoints: num(p.purchasePoint),
    priceHistory: [...(p.priceHistory ?? [])].reverse().map((h: Raw) => ({ date: h.recordedAt, price: num(h.price) })),
    inTheBox: parseBox(p.inTheBox),
    isFeatured: !!p.isFeatured,
    createdAt: p.createdAt ?? new Date().toISOString(),
    // extras the API gives us
    ...({
      hasVariants: isCard ? !!p.hasVariants : (p.variants ?? []).length > 0,
      avgRating: num(p.avgRating),
      reviewCount: num(p.reviewCount),
      warranty: p.warrantyInfo ?? '',
      freeShipping: !!p.freeShipping,
      tags: (p.tags ?? []).map((t: Raw) => t.tag),
      metaTitle: p.metaTitle ?? undefined,
      metaDescription: p.metaDescription ?? undefined,
    } as object),
  };
}

// ── catalog ──────────────────────────────────────────────
export function mapCategory(c: Raw): Category {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? '',
    icon: c.icon ?? '',
    subCategories: (c.subCategories ?? []).map((s: Raw) => ({ id: s.id, slug: s.slug, name: s.name, categorySlug: c.slug })),
    productCount: num(c._count?.products),
    ...({ image: c.image ? assetUrl(c.image) : null } as object),
  };
}

export function mapBrand(b: Raw): Brand {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description ?? '',
    logoUrl: b.logo ? assetUrl(b.logo) : '',
    country: b.country ?? '',
    foundedYear: num(b.foundedYear),
    productCount: num(b._count?.products),
  };
}

// ── reviews & questions ─────────────────────────────────
export function mapReview(r: Raw, productId?: string): Review {
  return {
    id: r.id,
    productId: r.productId ?? productId ?? '',
    reviewerName: r.reviewerName ?? r.user?.name ?? 'Customer',
    rating: num(r.rating),
    comment: [r.title, r.comment].filter(Boolean).join(' — '),
    date: r.date ?? r.createdAt,
    helpfulCount: num(r.helpfulCount),
    notHelpfulCount: num(r.notHelpfulCount),
    verified: !!(r.verified ?? r.isVerified),
  };
}

export function mapQuestion(q: Raw, productId?: string): Question {
  return {
    id: q.id,
    productId: q.productId ?? productId ?? '',
    askerName: q.user?.name ?? 'Customer',
    questionText: q.question,
    answerText: q.answer ?? undefined,
    answererName: q.answer ? 'Fairu Fashion Team' : undefined,
    date: q.createdAt,
  };
}

// ── orders ───────────────────────────────────────────────
// One word per server status, exactly as the admin dashboard shows it (dashboard/src/components/shared/StatusBadge.tsx).
export const STATUS_LABEL: Record<string, OrderStatus> = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PROCESSING: 'Processing', ON_HOLD: 'On hold',
  SHIPPED: 'Shipped', IN_TRANSIT: 'In transit', OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered', CANCELLED: 'Cancelled', RETURNED: 'Returned', REFUNDED: 'Refunded',
};
/** An order that ended without being delivered (no more steps to come). */
export const isOffTrack = (s: OrderStatus) => s === 'Cancelled' || s === 'Returned' || s === 'Refunded';
/** Nothing more will happen to it: delivered or ended. */
export const isFinished = (s: OrderStatus) => s === 'Delivered' || isOffTrack(s);
export const statusLabel = (s: string): OrderStatus => STATUS_LABEL[s] ?? 'Pending';
export const PAYMENT_LABEL: Record<string, PaymentMethod> = { CASH_ON_DELIVERY: 'Cash on Delivery', BKASH: 'bKash', NAGAD: 'Nagad', ROCKET: 'Rocket' };

export function mapAddress(a: Raw | null | undefined): ShippingAddress {
  return {
    fullName: a?.fullName ?? '',
    phone: a?.phone ?? '',
    address: a?.line1 ?? a?.address ?? '',
    city: [a?.upazila, a?.district ?? a?.city].filter(Boolean).join(', ') || a?.city || '',
    postalCode: a?.postalCode ?? '',
  };
}

export function mapOrder(o: Raw): Order {
  const items: OrderItem[] = (o.items ?? []).map((i: Raw) => ({
    productId: i.productId,
    slug: i.productSlug,
    name: i.productName,
    price: num(i.price),
    quantity: num(i.quantity),
    imageUrl: assetUrl(i.productImage),
    variantLabel: i.variantName ?? undefined,
  }));
  const history = [...(o.statusHistory ?? [])]
    .map((h: Raw) => ({ status: statusLabel(h.toStatus ?? h.status), timestamp: h.createdAt ?? h.timestamp, raw: h.toStatus ?? h.status, note: h.note }))
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  return {
    id: o.id,
    orderNumber: o.orderNumber ?? '',
    userId: o.userId ?? '',
    items,
    subtotal: num(o.subtotal),
    shippingCost: num(o.shippingCost),
    total: num(o.total),
    status: statusLabel(o.status),
    shippingAddress: mapAddress(o.shippingAddress),
    paymentMethod: PAYMENT_LABEL[o.paymentMethod] ?? 'Cash on Delivery',
    bkashTransactionId: o.bkashTransactionId ?? undefined,
    bkashSenderNumber: o.bkashSenderNumber ?? undefined,
    placedAt: o.placedAt,
    estimatedDelivery: o.estimatedDelivery ?? '',
    statusHistory: history.map((h) => ({ status: h.status, timestamp: h.timestamp })),
    rawStatus: o.status,
    paymentStatus: o.paymentStatus,
    discountAmount: num(o.discountAmount),
    couponCode: o.couponCode ?? null,
    paidAmount: num(o.paidAmount),
    dueAmount: num(o.dueAmount),
    courierName: o.courierName ?? null,
    trackingNumber: o.trackingNumber ?? null,
    trackingUrl: o.trackingUrl ?? null,
    canCancel: ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status),
    deliveryNote: o.deliveryNote ?? null,
    paymentVerifiedAt: o.paymentVerifiedAt ?? null,
    confirmedAt: o.confirmedAt ?? null,
    processingAt: o.processingAt ?? null,
    shippedAt: o.shippedAt ?? null,
    deliveredAt: o.deliveredAt ?? null,
  };
}

// ── user ─────────────────────────────────────────────────
export function mapUser(u: Raw): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    avatarUrl: u.avatarUrl ? assetUrl(u.avatarUrl) : '',
    orderIds: [],
    createdAt: u.createdAt ?? '',
  };
}
