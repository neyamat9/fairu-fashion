import { api, assetUrl } from '../api/client';

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  site: { storeName: 'Fairu Fashion', tagline: 'Elegance in Every Stitch', logoUrl: null, contactEmail: null, hotline: null, whatsapp: null, address: null, businessHours: null, socialLinks: {} },
  payment: { methods: ['CASH_ON_DELIVERY'], bkash: null, nagad: null, rocket: null },
  shipping: { mode: 'ZONE', freeShippingThreshold: null, insideDhakaCities: ['Dhaka'], options: [] },
  returns: { returnsEnabled: true, returnWindowDays: 7, policyText: null },
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const s = await api.get<any>('/customer/settings', { revalidate: 300 });
    return { ...FALLBACK, ...s, site: { ...FALLBACK.site, ...s.site, logoUrl: s.site?.logoUrl ? assetUrl(s.site.logoUrl) : null } };
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
