import { BEHAVIOR_CATEGORY } from './activity.types';

// Works out, from a request's route, what is being done to what. The route
// *pattern* (e.g. /api/admin/products/:id/variants/:variantId) is used, so ids
// and fixed words are never confused.

export interface RouteInfo {
  area: 'admin' | 'customer' | 'other';
  resource: string;
  // fixed words after the resource: ['variants'], ['status'], ['images','order']
  tail: string[];
  id?: string;
  subId?: string;
}

export function parseRoute(
  pattern: string,
  params: Record<string, string | undefined>,
  apiPrefix: string,
): RouteInfo {
  const tokens = pattern.split('/').filter(Boolean);
  if (tokens[0] === apiPrefix) tokens.shift();
  const area =
    tokens[0] === 'admin'
      ? 'admin'
      : tokens[0] === 'customer'
        ? 'customer'
        : 'other';
  const resource = tokens[area === 'other' ? 0 : 1] ?? '';
  const rest = tokens.slice(area === 'other' ? 1 : 2);

  const tail: string[] = [];
  const paramNames: string[] = [];
  for (const t of rest) {
    if (t.startsWith(':')) paramNames.push(t.slice(1));
    else tail.push(t);
  }
  return {
    area,
    resource,
    tail,
    id: paramNames[0] ? params[paramNames[0]] : undefined,
    subId: paramNames[1] ? params[paramNames[1]] : undefined,
  };
}

// Prisma model delegates the interceptor may read before/after an admin edit.
export interface EntityDef {
  type: string; // human entity type used in the log
  model: string; // Prisma delegate name
  label: (row: Record<string, unknown>) => string | undefined;
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const pick =
  (...keys: string[]) =>
  (row: Record<string, unknown>) => {
    for (const k of keys) {
      const v = str(row[k]);
      if (v) return v;
    }
    return undefined;
  };

export const ADMIN_ENTITIES: Record<string, EntityDef> = {
  products: { type: 'product', model: 'product', label: pick('name') },
  'products.variants': {
    type: 'product variant',
    model: 'productVariant',
    label: pick('sku', 'name'),
  },
  'products.images': {
    type: 'product image',
    model: 'productImage',
    label: pick('alt', 'url'),
  },
  category: { type: 'category', model: 'category', label: pick('name') },
  'sub-category': {
    type: 'sub-category',
    model: 'subCategory',
    label: pick('name'),
  },
  brand: { type: 'brand', model: 'brand', label: pick('name') },
  coupons: { type: 'coupon', model: 'coupon', label: pick('code') },
  banners: { type: 'banner', model: 'banner', label: pick('title') },
  'flash-deals': {
    type: 'flash deal',
    model: 'flashDeal',
    label: pick('name', 'title'),
  },
  orders: { type: 'order', model: 'order', label: pick('orderNumber') },
  users: { type: 'user', model: 'user', label: pick('email', 'name') },
  returns: {
    type: 'return request',
    model: 'returnRequest',
    label: pick('id'),
  },
  'support-tickets': {
    type: 'support ticket',
    model: 'supportTicket',
    label: pick('ticketNumber', 'subject'),
  },
  'contact-messages': {
    type: 'contact message',
    model: 'contactMessage',
    label: pick('subject'),
  },
  reviews: { type: 'review', model: 'review', label: pick('title', 'id') },
  questions: {
    type: 'product question',
    model: 'productQuestion',
    label: pick('question'),
  },
  newsletter: {
    type: 'newsletter subscriber',
    model: 'newsletterSubscriber',
    label: pick('email'),
  },
  uploads: {
    type: 'media file',
    model: 'upload',
    label: pick('originalName', 'key'),
  },
};

// Entity names for customer routes (no snapshots are taken for those).
const CUSTOMER_ENTITY: Record<string, string> = {
  orders: 'order',
  reviews: 'review',
  returns: 'return request',
  addresses: 'address',
  'support-tickets': 'support ticket',
  uploads: 'upload',
  cart: 'cart item',
  wishlist: 'wishlist item',
  notifications: 'notification',
  coupons: 'coupon',
  contact: 'contact message',
  newsletter: 'newsletter subscription',
  questions: 'product question',
  auth: 'account',
  checkout: 'checkout',
};

export function entityTypeFor(info: RouteInfo): string | undefined {
  if (info.area === 'admin') {
    const sub =
      info.tail[0] && info.subId
        ? `${info.resource}.${info.tail[0]}`
        : undefined;
    return (
      (sub && ADMIN_ENTITIES[sub]?.type) ||
      ADMIN_ENTITIES[info.resource]?.type ||
      info.resource
    );
  }
  return CUSTOMER_ENTITY[info.resource] ?? info.resource;
}

const ADMIN_CATEGORY: Record<string, string> = {
  products: 'catalog',
  category: 'catalog',
  'sub-category': 'catalog',
  brand: 'catalog',
  uploads: 'catalog',
  inventory: 'inventory',
  banners: 'marketing',
  'flash-deals': 'marketing',
  coupons: 'marketing',
  newsletter: 'marketing',
  orders: 'order',
  returns: 'order',
  payments: 'order',
  refunds: 'order',
  users: 'customers',
  'support-tickets': 'customer-care',
  'contact-messages': 'customer-care',
  reviews: 'customer-care',
  questions: 'customer-care',
  settings: 'settings',
  auth: 'auth',
  'activity-logs': 'security',
};

const CUSTOMER_CATEGORY: Record<string, string> = {
  auth: 'auth',
  orders: 'order',
  checkout: BEHAVIOR_CATEGORY,
  coupons: BEHAVIOR_CATEGORY,
  returns: 'order',
  cart: BEHAVIOR_CATEGORY,
  wishlist: BEHAVIOR_CATEGORY,
  'recently-viewed': BEHAVIOR_CATEGORY,
  notifications: BEHAVIOR_CATEGORY,
  addresses: 'account',
  reviews: 'content',
  questions: 'content',
  uploads: 'content',
  'support-tickets': 'support',
  contact: 'support',
  newsletter: 'support',
};

export function categoryFor(info: RouteInfo): string {
  const map = info.area === 'admin' ? ADMIN_CATEGORY : CUSTOMER_CATEGORY;
  return map[info.resource] ?? (info.area === 'admin' ? 'admin' : 'other');
}

const VERB: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
  GET: 'view',
};
const PAST: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  view: 'viewed',
};

export function actionFor(
  info: RouteInfo,
  method: string,
  tail = info.tail,
): string {
  const verb = VERB[method] ?? method.toLowerCase();
  const parts = [info.area, info.resource, ...tail, verb].filter(Boolean);
  // GET export / invoice read better as "…export" than "…export.view"
  return parts.join('.');
}

// Plain-language endings for the actions people care about most.
const SPECIAL: Record<string, string> = {
  'customer.auth.login.create': 'logged in',
  'customer.auth.register.create': 'registered an account',
  'customer.auth.logout.create': 'logged out',
  'customer.auth.forgot-password.create': 'requested a password reset',
  'customer.auth.reset-password.create': 'reset their password',
  'customer.auth.change-password.create': 'changed their password',
  'customer.auth.profile.update': 'updated their profile',
  'admin.auth.login.create': 'logged in to the admin dashboard',
  'admin.auth.logout.create': 'logged out of the admin dashboard',
  'admin.auth.change-password.create': 'changed their admin password',
  'admin.auth.forgot-password.create': 'requested an admin password reset',
  'admin.auth.reset-password.create': 'reset their admin password',
  'admin.auth.me.update': 'updated their admin profile',
  'customer.orders.create': 'placed an order',
  'customer.orders.cancel.create': 'cancelled an order',
  'customer.orders.reorder.create': 'reordered a previous order',
  'customer.checkout.summary.create': 'previewed checkout',
  'customer.coupons.apply.create': 'tried a coupon',
  'customer.cart.create': 'added an item to the cart',
  'customer.cart.update': 'changed a cart item',
  'customer.cart.delete': 'removed an item from the cart',
  'customer.cart.merge.create': 'merged a guest cart into their account',
  'customer.returns.create': 'requested a return',
  'customer.reviews.create': 'wrote a review',
  'customer.support-tickets.create': 'opened a support ticket',
  'customer.contact.create': 'sent a contact message',
  'customer.newsletter.subscribe.create': 'subscribed to the newsletter',
  'customer.newsletter.unsubscribe.create': 'unsubscribed from the newsletter',
  'admin.orders.verify-payment.update':
    'verified/rejected a bKash payment for order',
};

export function describe(args: {
  actor: string;
  action: string;
  method: string;
  info: RouteInfo;
  entityType?: string;
  entityLabel?: string;
}): string {
  const { actor, action, method, info, entityType, entityLabel } = args;
  const label = entityLabel ? ` “${entityLabel}”` : '';
  const special = SPECIAL[action];
  if (special) return `${actor} ${special}${label}`;

  const verb = VERB[method] ?? method.toLowerCase();
  const past = PAST[verb] ?? verb;
  // Fixed words that name a sub-resource are already in entityType
  const words = info.tail.filter((t) => !(info.subId && t === info.tail[0]));
  const detail = words.length ? ` ${words.join(' ').replace(/-/g, ' ')}` : '';
  return `${actor} ${past} ${entityType ?? info.resource}${detail}${label}`;
}
