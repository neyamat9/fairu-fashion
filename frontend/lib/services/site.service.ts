import { api, assetUrl } from '../api/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  site: {
    storeName: string;
    tagline: string;
    logoUrl: string | null;
    contactEmail: string | null;
    hotline: string | null;
    whatsapp: string | null;
    address: string | null;
    businessHours: string | null;
    socialLinks: Record<string, string>;
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
  };
  payment: { methods: ('CASH_ON_DELIVERY' | 'BKASH' | 'NAGAD' | 'ROCKET')[]; bkash: MobileAccount | null; nagad: MobileAccount | null; rocket: MobileAccount | null };
  shipping: { mode: 'GLOBAL' | 'ZONE'; freeShippingThreshold: number | null; insideDhakaCities: string[]; options: ShippingOption[] };
  returns: { returnsEnabled: boolean; returnWindowDays: number; policyText: string | null };
}
/** Where to send money for one mobile-banking method (set by the admin in the dashboard) */
export interface MobileAccount {
  number: string;
  accountType: 'personal' | 'merchant' | 'agent';
  instructions: string | null;
}
export interface ShippingOption {
  zone: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA' | 'GLOBAL';
  label: string;
  rate: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
}

const FALLBACK: SiteSettings = {
  site: {
    storeName: 'Fairu Fashion',
    tagline: 'Elegance in Every Stitch',
    logoUrl: null,
    contactEmail: null,
    hotline: null,
    whatsapp: null,
    address: null,
    businessHours: null,
    socialLinks: {},
    heroBgUrl: '/hero/hero-slide-1.webp',
    heroModels: [
      '/hero/hero-slide-1.webp',
      '/hero/hero-slide-2.webp',
      '/hero/hero-slide-3.webp',
    ],
    heroBadge: 'TIMELESS ELEGANCE',
    heroTitle: 'Grace in Every',
    heroHighlight: 'Three Piece',
    heroDescription: "Discover our exclusive collection of women's three piece outfits — crafted for your everyday grace and special moments.",
    heroButtonText: 'Shop Now',
    heroButtonLink: '/category/three-piece',
    heroIntervalSeconds: 5,
    craftedSection: {
      title: 'CRAFTED FOR THE ELEGANT WOMAN',
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
  payment: { methods: ['CASH_ON_DELIVERY'], bkash: null, nagad: null, rocket: null },
  shipping: { mode: 'ZONE', freeShippingThreshold: null, insideDhakaCities: ['Dhaka'], options: [] },
  returns: { returnsEnabled: true, returnWindowDays: 7, policyText: null },
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const s = await api.get<any>('/customer/settings', { revalidate: 300 });
    const siteData = s.site ?? {};
    return {
      ...FALLBACK,
      ...s,
      site: {
        ...FALLBACK.site,
        ...siteData,
        logoUrl: siteData.logoUrl ? assetUrl(siteData.logoUrl) : null,
        heroBgUrl: siteData.heroBgUrl ? assetUrl(siteData.heroBgUrl) : FALLBACK.site.heroBgUrl,
        heroModels: Array.isArray(siteData.heroModels) && siteData.heroModels.length > 0
          ? siteData.heroModels.map((m: string) => assetUrl(m))
          : FALLBACK.site.heroModels,
        craftedSection: siteData.craftedSection
          ? {
              title: siteData.craftedSection.title ?? FALLBACK.site.craftedSection?.title,
              subtitle: siteData.craftedSection.subtitle ?? FALLBACK.site.craftedSection?.subtitle,
              items: Array.isArray(siteData.craftedSection.items) && siteData.craftedSection.items.length > 0
                ? siteData.craftedSection.items.map((item: any) => ({
                    ...item,
                    imageUrl: assetUrl(item.imageUrl),
                  }))
                : (FALLBACK.site.craftedSection?.items ?? []),
            }
          : FALLBACK.site.craftedSection,
      },
    };
  } catch {
    return FALLBACK;
  }
}

export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  href: string | null;
  position: string;
  bgColor: string | null;
  textColor: string | null;
}
export async function getBanners(position?: string): Promise<Banner[]> {
  try {
    const rows = await api.get<any[]>(`/customer/banners${position ? `?position=${position}` : ''}`, { revalidate: 300 });
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      imageUrl: assetUrl(b.imageUrl),
      mobileImageUrl: b.mobileImageUrl ? assetUrl(b.mobileImageUrl) : null,
      href: b.linkType === 'PRODUCT' && b.linkResourceId ? `/products/${b.linkResourceId}` : b.linkType === 'CATEGORY' && b.linkResourceId ? `/category/${b.linkResourceId}` : b.linkUrl || null,
      position: b.position,
      bgColor: b.bgColor,
      textColor: b.textColor,
    }));
  } catch {
    return [];
  }
}

export async function getShippingOptions(): Promise<ShippingOption[]> {
  const r = await api.get<{ options: ShippingOption[] }>('/customer/shipping/options', { revalidate: 300 });
  return r.options;
}
