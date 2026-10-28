// Store-wide settings managed from the admin dashboard. Each group is stored
// as one JSON row in the SiteSetting table (key = group name) and merged over
// these defaults on read, so a missing row or a newly added field always has
// a sane value.

export type SettingsGroup =
  | 'site'
  | 'payment'
  | 'shipping'
  | 'returns'
  | 'email';

export const SETTINGS_GROUPS: SettingsGroup[] = [
  'site',
  'payment',
  'shipping',
  'returns',
  'email',
];

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
}

export interface CraftedProductItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  categoryTag?: string;
  bgGradient?: string;
}

export interface CraftedSectionSettings {
  title?: string;
  subtitle?: string;
  items: CraftedProductItem[];
}

export interface SiteSettings {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  contactEmail: string | null;
  hotline: string | null;
  whatsapp: string | null;
  address: string | null;
  businessHours: string | null;
  currency: string;
  currencySymbol: string;
  metaTitle: string | null;
  metaDescription: string | null;
  socialLinks: SocialLinks;
  heroBgUrl?: string | null;
  heroModels?: string[];
  heroBadge?: string | null;
  heroTitle?: string | null;
  heroHighlight?: string | null;
  heroDescription?: string | null;
  heroButtonText?: string | null;
  heroButtonLink?: string | null;
  heroIntervalSeconds?: number;
  craftedSection?: CraftedSectionSettings;
}

export type MobileBankingMethod = 'BKASH' | 'NAGAD' | 'ROCKET';
export const MOBILE_BANKING_METHODS: readonly MobileBankingMethod[] = [
  'BKASH',
  'NAGAD',
  'ROCKET',
];
export const PAYMENT_LABEL: Record<string, string> = {
  CASH_ON_DELIVERY: 'Cash on Delivery',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
};
export const isMobileBanking = (m: string): m is MobileBankingMethod =>
  (MOBILE_BANKING_METHODS as readonly string[]).includes(m);

export interface PaymentSettings {
  codEnabled: boolean;
  bkashEnabled: boolean;
  bkashNumber: string | null;
  // personal | merchant | agent — shown to the customer so they pick the
  // right option ("Send Money" vs "Payment") in the bKash app.
  bkashAccountType: 'personal' | 'merchant' | 'agent';
  bkashInstructions: string | null;
  nagadEnabled: boolean;
  nagadNumber: string | null;
  nagadAccountType: 'personal' | 'merchant' | 'agent';
  nagadInstructions: string | null;
  rocketEnabled: boolean;
  rocketNumber: string | null;
  rocketAccountType: 'personal' | 'merchant' | 'agent';
  rocketInstructions: string | null;
}

/** The shop's account for one mobile-banking method, or null when it is off / has no number yet. */
export function mobileAccount(p: PaymentSettings, m: MobileBankingMethod) {
  const k = m.toLowerCase() as 'bkash' | 'nagad' | 'rocket';
  const enabled = p[`${k}Enabled`];
  const number = p[`${k}Number`];
  if (!enabled || !number) return null;
  return {
    number,
    accountType: p[`${k}AccountType`],
    instructions: p[`${k}Instructions`],
  };
}

// GLOBAL: one flat rate for every address.
// ZONE:   separate rates for inside Dhaka and outside Dhaka.
export type ShippingMode = 'GLOBAL' | 'ZONE';
export type ShippingZone = 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';

export interface ShippingSettings {
  mode: ShippingMode;
  globalRate: number;
  globalMinDays: number;
  globalMaxDays: number;
  insideDhakaRate: number;
  insideDhakaMinDays: number;
  insideDhakaMaxDays: number;
  outsideDhakaRate: number;
  outsideDhakaMinDays: number;
  outsideDhakaMaxDays: number;
  // Cities (case-insensitive) that count as "inside Dhaka" when the customer
  // does not pick a zone explicitly.
  insideDhakaCities: string[];
  // Subtotal at or above which shipping is free. null = never free.
  freeShippingThreshold: number | null;
}

export interface ReturnSettings {
  returnsEnabled: boolean;
  // Days after delivery during which a customer can request a return.
  returnWindowDays: number;
  policyText: string | null;
}

// none:   emails are not sent (they are written to the server log instead)
// smtp:   any SMTP server (Gmail, Zoho, cPanel mail, Amazon SES SMTP...)
// resend: Resend HTTP API (https://resend.com)
export type EmailProvider = 'none' | 'smtp' | 'resend';

export interface EmailSettings {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string | null;
  replyTo: string | null;

  smtpHost: string | null;
  smtpPort: number;
  // true for port 465 (implicit TLS); false for 587/25 (STARTTLS)
  smtpSecure: boolean;
  smtpUser: string | null;
  smtpPass: string | null; // secret — encrypted at rest, never returned

  resendApiKey: string | null; // secret — encrypted at rest, never returned

  // Where admin alerts (new order, contact message) are sent.
  adminNotificationEmail: string | null;

  // Which emails are sent
  notifyCustomerOrderPlaced: boolean;
  notifyCustomerOrderStatus: boolean;
  notifyAdminNewOrder: boolean;
  notifyAdminContactMessage: boolean;
  notifyAdminSupportTicket: boolean;
  notifyCustomerTicketReply: boolean;
  sendNewsletterWelcome: boolean;
}

// Fields encrypted in the database and masked in admin responses.
export const SECRET_FIELDS: { [G in SettingsGroup]?: string[] } = {
  email: ['smtpPass', 'resendApiKey'],
};

export interface SettingsMap {
  site: SiteSettings;
  payment: PaymentSettings;
  shipping: ShippingSettings;
  returns: ReturnSettings;
  email: EmailSettings;
}

export const DEFAULT_SETTINGS: SettingsMap = {
  site: {
    storeName: 'Fairu Fashion',
    tagline: 'Elegance in Every Stitch',
    logoUrl: null,
    faviconUrl: null,
    contactEmail: 'neyamat7.ullah@gmail.com',
    hotline: '01620490985',
    whatsapp: '01620490985',
    address: 'Dhaka, Bangladesh',
    businessHours: 'Always Open (24/7)',
    currency: 'BDT',
    currencySymbol: '৳',
    metaTitle: "Fairu Fashion | Elegant Women's Dresses & Wear",
    metaDescription: "Discover exquisite women's dresses, party wear, ethnic kurtis, modest abayas, and chic evening gowns at Fairu Fashion.",
    socialLinks: {
      facebook: 'https://www.facebook.com/fairufashion',
      instagram: 'https://www.instagram.com/fairufashion',
      tiktok: 'https://www.tiktok.com/@fairufashion',
      whatsapp: 'https://wa.me/8801620490985',
    },
    heroBgUrl: '/hero/hero-slide-1.webp',
    heroModels: [
      '/hero/hero-slide-1.webp',
      '/hero/hero-slide-2.webp',
      '/hero/hero-slide-3.webp',
    ],
    heroBadge: 'TIMELESS ELEGANCE',
    heroTitle: 'Exclusive',
    heroHighlight: "Women's Fashion",
    heroDescription: "Discover our exclusive collection of women's three piece, two piece, and ready-to-wear outfits crafted for everyday grace and celebrations.",
    heroButtonText: 'Shop Now',
    heroButtonLink: '/products',
    heroIntervalSeconds: 5,
    craftedSection: {
      title: 'Crafted for the Elegant Woman',
      subtitle:
        'Essential silhouettes, rich hand-woven textures, and effortless luxury for every occasion.',
      items: [
        {
          productId: 'zamzam-casual',
          name: 'Zamzam Royal Three Piece',
          slug: 'three-piece',
          price: 3450,
          imageUrl: '/curated/curated-1.jpg',
          categoryTag: 'CASUAL WEAR',
          bgGradient: 'from-[#FDF2F4] via-[#F9E2E7] to-[#F1CAD4]',
        },
        {
          productId: 'bin-hamid-luxe',
          name: 'Bin Hamid Luxury Lawn',
          slug: 'three-piece',
          price: 3950,
          imageUrl: '/curated/curated-2.jpg',
          categoryTag: 'LUXURY LAWN',
          bgGradient: 'from-[#FEF9EE] via-[#FDF0D5] to-[#F7E1B5]',
        },
        {
          productId: 'festive-embroidered',
          name: 'Summer Floral Festive',
          slug: 'three-piece',
          price: 2850,
          imageUrl: '/curated/curated-3.jpg',
          categoryTag: 'FESTIVE WEAR',
          bgGradient: 'from-[#F0F8FD] via-[#DBEFFC] to-[#C3E4FA]',
        },
        {
          productId: 'royal-silk',
          name: 'Gul Ahmed Mint Silk',
          slug: 'three-piece',
          price: 4200,
          imageUrl: '/curated/curated-4.jpg',
          categoryTag: 'ROYAL SILK',
          bgGradient: 'from-[#EFFCF6] via-[#D8F8EA] to-[#BAF2D8]',
        },
        {
          productId: 'rose-organza',
          name: 'Fairu Rose Organza Edit',
          slug: 'three-piece',
          price: 4800,
          imageUrl: '/curated/curated-5.jpg',
          categoryTag: 'EXCLUSIVE COUTURE',
          bgGradient: 'from-[#FDF3F6] via-[#FBE2EB] to-[#F7CADB]',
        },
      ],
    },
  },
  payment: {
    codEnabled: true,
    bkashEnabled: true,
    bkashNumber: null,
    bkashAccountType: 'personal',
    bkashInstructions: null,
    nagadEnabled: false,
    nagadNumber: null,
    nagadAccountType: 'personal',
    nagadInstructions: null,
    rocketEnabled: false,
    rocketNumber: null,
    rocketAccountType: 'personal',
    rocketInstructions: null,
  },
  shipping: {
    mode: 'ZONE',
    globalRate: 100,
    globalMinDays: 2,
    globalMaxDays: 5,
    insideDhakaRate: 60,
    insideDhakaMinDays: 1,
    insideDhakaMaxDays: 2,
    outsideDhakaRate: 120,
    outsideDhakaMinDays: 3,
    outsideDhakaMaxDays: 5,
    insideDhakaCities: ['Dhaka'],
    freeShippingThreshold: null,
  },
  returns: {
    returnsEnabled: true,
    returnWindowDays: 7,
    policyText: null,
  },
  email: {
    provider: 'none',
    fromName: 'Fairu Fashion',
    fromEmail: null,
    replyTo: null,
    smtpHost: null,
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: null,
    smtpPass: null,
    resendApiKey: null,
    adminNotificationEmail: null,
    notifyCustomerOrderPlaced: true,
    notifyCustomerOrderStatus: true,
    notifyAdminNewOrder: true,
    notifyAdminContactMessage: true,
    notifyAdminSupportTicket: true,
    notifyCustomerTicketReply: true,
    sendNewsletterWelcome: true,
  },
};
