/**
 * Seeds the gadget-accessory catalog: brands + products (with images, variants,
 * specifications) and tidies the matching categories for the storefront.
 *
 *   npx ts-node --transpile-only prisma/seed-gadgets.ts
 *
 * Safe to re-run: categories/brands are upserted by slug and the products
 * listed in gadgets.json are recreated by slug. Nothing else is touched.
 * Run `prisma/seed.ts` first so the categories and sub-categories exist.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import * as argon2 from 'argon2';
import { join } from 'path';

let dbUrl = process.env.DATABASE_URL || '';
dbUrl = dbUrl.replace(/&channel_binding=[^&]*/, '');
dbUrl = dbUrl.replace(/\?channel_binding=[^&]*&?/, '?');
const pool = new Pool({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const photo = (id: string, size = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${size}&h=${size}&q=80`;

/** Existing categories (from seed.ts) that carry the accessory catalog */
const CATEGORY_META: Record<
  string,
  { image: string; icon: string; description: string }
> = {
  accessories: {
    image: photo('photo-1587749091230-fb8a034d695c', 700),
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    description: 'Chargers, power banks, cables, cases and screen protectors',
  },
  'audio-equipment': {
    image: photo('photo-1600375104627-c94c416deefa', 700),
    icon: 'M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h1v-7H6a3 3 0 00-3 3zm18 0a3 3 0 01-3 3h-1v-7h1a3 3 0 013 3z',
    description: 'Earbuds, headphones and Bluetooth speakers',
  },
  wearables: {
    image: photo('photo-1627040849263-b94ab1502618', 700),
    icon: 'M9 3h6l1 4H8l1-4zm-1 14h8l-1 4H9l-1-4zM7 7h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2zm5 3v2l1.5 1',
    description: 'Smartwatches and fitness bands',
  },
  peripherals: {
    image: photo('photo-1618384887929-16ec33fab9ef', 700),
    icon: 'M3 8h18a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1zm5 3h.01M11 11h.01M14 11h.01M17 11h.01M7 15h10',
    description: 'Wireless keyboards and mice for every desk',
  },
  gaming: {
    image: photo('photo-1603985753826-30c036e8804d', 700),
    icon: 'M6 11h4m-2-2v4m7-1h.01M18 12h.01M17.5 6h-11A4.5 4.5 0 002 10.5v3A4.5 4.5 0 006.5 18c1 0 1.9-.5 2.4-1.3L10 15h4l1.1 1.7c.5.8 1.4 1.3 2.4 1.3a4.5 4.5 0 004.5-4.5v-3A4.5 4.5 0 0017.5 6z',
    description: 'Controllers, gaming keyboards and mouse gear',
  },
  'mobile-devices': {
    image: photo('photo-1511707171634-5f897ff02aa9', 700),
    icon: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm5 15h.01',
    description: 'Smartphones from the brands you trust',
  },
  'smart-home': {
    image: photo('photo-1507646227500-4d389b0012be', 700),
    icon: 'M3 12l9-9 9 9M5 10v10h14V10M10 20v-6h4v6',
    description: 'Smart speakers and connected gadgets for the home',
  },
  'creator-equipment': {
    image: photo('photo-1670946022015-bbc792101840', 700),
    icon: 'M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M5 6h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
    description: 'Gimbals, tripods and gear for creators',
  },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

/** Old catalog category -> [category slug, sub-category name] */
const MAP: Record<string, Record<string, [string, string]>> = {
  'chargers-cables': {
    'fast-chargers': ['accessories', 'Chargers'],
    'usb-c-cables': ['accessories', 'Cables'],
    'wireless-chargers': ['accessories', 'Chargers'],
  },
  'power-banks': {
    '*': ['accessories', 'Power Banks'],
  },
  'earbuds-headphones': {
    'true-wireless-earbuds': ['audio-equipment', 'Earbuds'],
    'over-ear-headphones': ['audio-equipment', 'Headphones'],
  },
  'smartwatches-bands': {
    smartwatches: ['wearables', 'Smartwatches'],
    'fitness-bands': ['wearables', 'Fitness Trackers'],
  },
  'phone-cases-protection': {
    'phone-cases': ['accessories', 'Phone Cases'],
    'screen-protectors': ['accessories', 'Screen Protectors'],
  },
  'bluetooth-speakers': { '*': ['audio-equipment', 'Speakers'] },
  'keyboards-mice': {
    'wireless-keyboards': ['peripherals', 'Keyboards'],
    'wireless-mice': ['peripherals', 'Mice'],
  },
  'gaming-accessories': {
    controllers: ['gaming', 'Controllers'],
    'gaming-headsets': ['audio-equipment', 'Headphones'],
    'mouse-pads': ['gaming', 'Gaming Mice'],
  },
};

interface Seed {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  brandName: string;
  category: string;
  subCategory: string;
  productCode: string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: { url: string; alt: string }[];
  variants: { label: string; colorHex?: string; stock: number; sku: string; image?: string }[];
  specs: { groupName: string; items: { key: string; value: string }[] }[];
  inTheBox: string[];
  badges: string[];
  sold: number;
  featured: boolean;
}

const EXTRA: Seed[] = [
  {
    slug: 'xiaomi-redmi-note-13-pro-8-256gb',
    name: 'Xiaomi Redmi Note 13 Pro 8GB/256GB',
    shortDescription: '200MP camera, 120Hz AMOLED display and 67W turbo charging.',
    description:
      'Redmi Note 13 Pro pairs a 200MP main camera with a 6.67-inch 120Hz AMOLED display and a 5,100mAh battery that charges at 67W. Gorilla Glass 5 and an IP54 rating make it a durable everyday phone.',
    brandName: 'Xiaomi', category: 'mobile-devices', subCategory: 'Smartphones', productCode: 'RN13P-8-256',
    price: 32999, originalPrice: 35999, stock: 40,
    images: [photo('photo-1511707171634-5f897ff02aa9'), photo('photo-1640936343842-268f9d87e764')].map((url) => ({ url, alt: 'Xiaomi Redmi Note 13 Pro' })),
    variants: [
      { label: 'Midnight Black', colorHex: '#1a2540', stock: 20, sku: 'RN13P-8-256-BLK' },
      { label: 'Aurora Purple', colorHex: '#8b7bd8', stock: 20, sku: 'RN13P-8-256-PUR' },
    ],
    specs: [
      { groupName: 'Display', items: [{ key: 'Screen', value: '6.67" AMOLED, 120Hz' }, { key: 'Protection', value: 'Gorilla Glass 5' }] },
      { groupName: 'Performance', items: [{ key: 'Memory', value: '8GB RAM / 256GB' }, { key: 'Battery', value: '5,100 mAh, 67W' }] },
    ],
    inTheBox: ['Phone', '67W charger', 'USB-C cable', 'Clear case', 'SIM tool'], badges: ['HOT'], sold: 17, featured: true,
  },
  {
    slug: 'samsung-galaxy-a55-5g-8-128gb',
    name: 'Samsung Galaxy A55 5G 8GB/128GB',
    shortDescription: 'Premium metal frame, Super AMOLED 120Hz display and 4 years of updates.',
    description:
      'Galaxy A55 5G brings a metal-and-glass design, a vivid 6.6-inch Super AMOLED 120Hz screen, a 50MP OIS camera and IP67 water resistance, with four generations of OS updates.',
    brandName: 'Samsung', category: 'mobile-devices', subCategory: 'Smartphones', productCode: 'SM-A556-8-128',
    price: 46500, originalPrice: 49900, stock: 25,
    images: [photo('photo-1640936343842-268f9d87e764'), photo('photo-1511707171634-5f897ff02aa9')].map((url) => ({ url, alt: 'Samsung Galaxy A55 5G' })),
    variants: [],
    specs: [
      { groupName: 'Display', items: [{ key: 'Screen', value: '6.6" Super AMOLED, 120Hz' }] },
      { groupName: 'Camera & Battery', items: [{ key: 'Main camera', value: '50MP OIS' }, { key: 'Battery', value: '5,000 mAh, 25W' }, { key: 'Water resistance', value: 'IP67' }] },
    ],
    inTheBox: ['Phone', 'USB-C cable', 'SIM tool'], badges: ['NEW'], sold: 9, featured: false,
  },
  {
    slug: 'amazon-echo-dot-5th-gen',
    name: 'Amazon Echo Dot (5th Gen) Smart Speaker',
    shortDescription: 'Compact smart speaker with Alexa, improved bass and a built-in temperature sensor.',
    description:
      'Echo Dot (5th Gen) delivers clearer vocals and deeper bass in a compact fabric-wrapped design. Control smart lights, set routines and play music with your voice.',
    brandName: 'Amazon', category: 'smart-home', subCategory: 'Smart Speakers', productCode: 'ECHO-DOT-5',
    price: 7500, originalPrice: 8500, stock: 36,
    images: [photo('photo-1507646227500-4d389b0012be'), photo('photo-1544380935-17ce6a107313')].map((url) => ({ url, alt: 'Smart speaker' })),
    variants: [
      { label: 'Charcoal', colorHex: '#3a3f4a', stock: 18, sku: 'ECHO-DOT-5-CHR' },
      { label: 'Coral', colorHex: '#e8757a', stock: 18, sku: 'ECHO-DOT-5-COR' },
    ],
    specs: [{ groupName: 'Features', items: [{ key: 'Voice assistant', value: 'Alexa' }, { key: 'Connectivity', value: 'Wi-Fi, Bluetooth' }, { key: 'Sensor', value: 'Temperature' }] }],
    inTheBox: ['Echo Dot', 'Power adapter'], badges: ['HOT'], sold: 13, featured: false,
  },
  {
    slug: 'xiaomi-smart-speaker-ir-control',
    name: 'Xiaomi Smart Speaker with IR Control',
    shortDescription: 'Voice-controlled speaker that also operates your TV and AC by infrared.',
    description:
      'A compact smart speaker with a built-in IR blaster so you can control your TV, AC and fans by voice, plus clear 12W sound for music and podcasts.',
    brandName: 'Xiaomi', category: 'smart-home', subCategory: 'Smart Speakers', productCode: 'XM-SPK-IR',
    price: 5900, stock: 28,
    images: [photo('photo-1544380935-17ce6a107313'), photo('photo-1507646227500-4d389b0012be')].map((url) => ({ url, alt: 'Xiaomi smart speaker' })),
    variants: [],
    specs: [{ groupName: 'Features', items: [{ key: 'Output', value: '12W' }, { key: 'Control', value: 'IR blaster, voice' }] }],
    inTheBox: ['Speaker', 'Power adapter'], badges: [], sold: 7, featured: false,
  },
  {
    slug: 'dji-osmo-mobile-6-gimbal',
    name: 'DJI Osmo Mobile 6 Smartphone Gimbal',
    shortDescription: '3-axis stabilisation, ActiveTrack 6.0 and a built-in extension rod.',
    description:
      'Osmo Mobile 6 keeps every shot silky smooth with 3-axis stabilisation, tracks your subject with ActiveTrack 6.0 and folds down to pocket size. A built-in extension rod gets you the perfect angle.',
    brandName: 'DJI', category: 'creator-equipment', subCategory: 'Tripods', productCode: 'DJI-OM6',
    price: 13900, originalPrice: 15500, stock: 14,
    images: [photo('photo-1670946021911-17c79d9f8d8b'), photo('photo-1670946022015-bbc792101840')].map((url) => ({ url, alt: 'DJI Osmo Mobile 6' })),
    variants: [],
    specs: [{ groupName: 'Features', items: [{ key: 'Stabilisation', value: '3-axis' }, { key: 'Tracking', value: 'ActiveTrack 6.0' }, { key: 'Battery', value: 'Up to 6.4 hours' }] }],
    inTheBox: ['Osmo Mobile 6', 'Magnetic clamp', 'Carrying pouch', 'USB-C cable'], badges: ['LIMITED STOCK'], sold: 5, featured: true,
  },
  {
    slug: 'ulanzi-extendable-phone-tripod',
    name: 'Ulanzi Extendable Phone Tripod with Remote',
    shortDescription: 'Lightweight 1.5m tripod with a Bluetooth shutter remote for phones and action cams.',
    description:
      'A sturdy aluminium tripod that extends to 1.5 metres and folds into a compact bag. The included Bluetooth remote lets you shoot photos and video from a distance.',
    brandName: 'Ulanzi', category: 'creator-equipment', subCategory: 'Tripods', productCode: 'ULZ-TRI-15',
    price: 2400, stock: 55,
    images: [photo('photo-1670946022015-bbc792101840'), photo('photo-1670946021911-17c79d9f8d8b')].map((url) => ({ url, alt: 'Phone tripod' })),
    variants: [],
    specs: [{ groupName: 'Build', items: [{ key: 'Max height', value: '1.5 m' }, { key: 'Material', value: 'Aluminium' }, { key: 'Remote', value: 'Bluetooth shutter' }] }],
    inTheBox: ['Tripod', 'Phone clamp', 'Bluetooth remote'], badges: ['NEW'], sold: 11, featured: false,
  },
];

/** A couple of items are left out of stock so the storefront's sold-out state is visible */
const OUT_OF_STOCK = ['amazfit-balance', 'razer-wolverine-v2-chroma'];

const REVIEWERS = ['Rafiqul Islam', 'Tasnim Akter', 'Mehedi Hasan', 'Nusrat Jahan', 'Sakib Rahman', 'Farhana Yasmin', 'Tanvir Ahmed', 'Sadia Afrin'];
const COMMENTS: [number, string][] = [
  [5, 'Genuine product, sealed box and fast delivery. Works exactly as described — very happy with it.'],
  [5, 'Excellent quality for the price. I use it every day and have had zero issues so far.'],
  [4, 'Very good overall. Packaging could be better, but the product itself is great.'],
  [5, 'Better than I expected. Build quality feels premium and it arrived a day early.'],
  [4, 'Solid purchase. Does what it says and the warranty gave me confidence.'],
  [5, 'Third one I have bought from Fairu Fashion. Always original, always on time.'],
  [3, 'Good product, a little pricey compared to the local market, but quality is fine.'],
  [5, 'Highly recommended. Setup took a minute and the performance is fantastic.'],
];

const BRAND_INFO: Record<string, { description: string; country: string; foundedYear: number }> = {
  Anker: { description: 'Charging and audio brand behind GaN chargers, PowerCore power banks and Soundcore.', country: 'China', foundedYear: 2011 },
  Baseus: { description: 'Everyday digital accessories with clean design and great value.', country: 'China', foundedYear: 2011 },
  Xiaomi: { description: 'Smart, affordable gadgets for everyone.', country: 'China', foundedYear: 2010 },
  JBL: { description: 'Loud, punchy and rugged audio gear built to travel.', country: 'USA', foundedYear: 1946 },
  Logitech: { description: 'Keyboards, mice and headsets for productive desks and competitive gaming.', country: 'Switzerland', foundedYear: 1981 },
  Samsung: { description: 'The Galaxy ecosystem of phones, watches, earbuds and accessories.', country: 'South Korea', foundedYear: 1969 },
  Razer: { description: 'The lifestyle brand for gamers.', country: 'USA/Singapore', foundedYear: 2005 },
  Amazfit: { description: 'Smartwatches and fitness trackers with week-long battery life.', country: 'China', foundedYear: 2015 },
  Amazon: { description: 'Echo smart speakers and Alexa-enabled devices.', country: 'USA', foundedYear: 1994 },
  DJI: { description: 'Creator gear: gimbals, drones and cameras.', country: 'China', foundedYear: 2006 },
  Ulanzi: { description: 'Practical accessories for mobile creators.', country: 'China', foundedYear: 2014 },
};

/**
 * Placeholder brand logos (the owner can replace them from the dashboard):
 *  - brands on Simple Icons get their coloured vector icon from the CDN
 *  - the others get a generated wordmark, stored inline as a data: URI
 * (Brand names and logos remain trademarks of their owners.)
 */
const icon = (name: string, hex: string) => `https://cdn.simpleicons.org/${name}/${hex}`;
const wordmark = (text: string, hex: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90"><text x="130" y="60" text-anchor="middle" font-family="Arial Black,Arial,Helvetica,sans-serif" font-weight="900" font-size="48" letter-spacing="1" fill="#${hex}">${text}</text></svg>`,
  );
const BRAND_LOGOS: Record<string, string> = {
  Xiaomi: icon('xiaomi', 'FF6900'),
  Samsung: icon('samsung', '1428A0'),
  JBL: icon('jbl', 'FF3300'),
  Logitech: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/logitech.svg',
  Razer: icon('razer', '00A100'),
  Amazon: 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/amazon.svg',
  DJI: icon('dji', '1A1A1A'),
  Anker: wordmark('ANKER', '00A8E1'),
  Baseus: wordmark('BASEUS', '1A1A1A'),
  Amazfit: wordmark('amazfit', 'FF5C00'),
  Ulanzi: wordmark('ULANZI', '0B6FD6'),
};

function loadSeeds(): Seed[] {
  // gadgets.json is produced from the storefront's original mock catalog
  const raw = JSON.parse(readFileSync(join(__dirname, 'gadgets.json'), 'utf8'));
  const seeds: Seed[] = raw.map((p: any): Seed => {
    const group = MAP[p.category];
    const [category, subCategory] = group[p.subCategory] ?? group['*'];
    const colourVariants = (p.variants ?? []).filter((v: any) => v.type === 'color');
    return {
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      description: p.description,
      brandName: p.brandName,
      category,
      subCategory,
      productCode: p.variants?.[0]?.sku?.replace(/-C\d+$/, '') ?? p.slug,
      price: p.price,
      originalPrice: p.originalPrice,
      stock: p.stock,
      images: p.images.map((i: any) => ({ url: i.url, alt: i.alt })),
      variants: colourVariants.map((v: any) => ({ label: v.label, colorHex: v.colorHex, stock: v.stock, sku: v.sku })),
      specs: p.specs,
      inTheBox: p.inTheBox ?? [],
      badges: p.badges ?? [],
      sold: p.soldLast24h,
      featured: p.isFeatured,
    };
  });
  return [...seeds, ...EXTRA];
}

async function main() {
  const seeds = loadSeeds();

  // 1. categories — decorate the existing ones, mark them for the homepage
  console.log('Updating categories...');
  for (const [i, catSlug] of CATEGORY_ORDER.entries()) {
    const meta = CATEGORY_META[catSlug];
    const res = await prisma.category.updateMany({
      where: { slug: catSlug },
      data: { image: meta.image, icon: meta.icon, description: meta.description, isHomepage: true, displayOrder: i, status: 'ACTIVE' },
    });
    if (res.count === 0) throw new Error(`Category "${catSlug}" is missing — run prisma/seed.ts first`);
    console.log(`  ✓ ${catSlug}`);
  }

  // 2. brands
  console.log('Seeding brands...');
  const brandNames = [...new Set(seeds.map((s) => s.brandName))];
  const brandIds = new Map<string, string>();
  for (const [i, name] of brandNames.entries()) {
    const info = BRAND_INFO[name] ?? { description: '', country: '', foundedYear: 2000 };
    const b = await prisma.brand.upsert({
      where: { slug: slug(name) },
      update: { description: info.description, country: info.country, foundedYear: info.foundedYear, logo: BRAND_LOGOS[name] ?? null, isHomepage: true, status: 'ACTIVE' },
      create: { name, slug: slug(name), description: info.description, country: info.country, foundedYear: info.foundedYear, logo: BRAND_LOGOS[name] ?? null, isHomepage: true, displayOrder: i, status: 'ACTIVE' },
    });
    brandIds.set(name, b.id);
    console.log(`  ✓ ${name}`);
  }

  // 3. products
  console.log('Seeding products...');
  const topSold = [...seeds].filter((s) => !s.featured).sort((a, b) => b.sold - a.sold).slice(0, 8).map((s) => s.slug);

  for (const s of seeds) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: s.category } });
    const sub = await prisma.subCategory.findFirst({ where: { parentCategoryId: category.id, name: s.subCategory } });
    if (!sub) throw new Error(`Sub-category "${s.subCategory}" missing under ${s.category}`);

    // recreate cleanly so the script is re-runnable
    const old = { OR: [{ slug: s.slug }, { name: s.name }] };
    await prisma.cartItem.deleteMany({ where: { product: old } });
    await prisma.product.deleteMany({ where: old });

    const regular = s.originalPrice ?? s.price;
    await prisma.product.create({
      data: {
        name: s.name,
        slug: s.slug,
        productCode: s.productCode,
        description: s.description,
        shortDescription: s.shortDescription,
        warrantyInfo: '6 months brand warranty',
        brandName: s.brandName,
        categoryName: category.name,
        subCategoryName: sub.name,
        purchasePoint: Math.floor(s.price / 10),
        status: 'ACTIVE',
        buyingPrice: Math.round(s.price * 0.82),
        regularPrice: regular,
        sellingPrice: s.price,
        isDiscounted: regular > s.price,
        stock: OUT_OF_STOCK.includes(s.slug) ? 0 : s.stock,
        soldCount: s.sold * 24,
        totalSales: s.sold * 24,
        soldLast24h: s.sold,
        inTheBox: JSON.stringify(s.inTheBox),
        freeShipping: s.price >= 2000,
        hasSpecification: s.specs.length > 0,
        isFeatured: s.featured,
        isNew: s.badges.includes('NEW'),
        isHot: s.badges.includes('HOT'),
        isLimitedStock: s.badges.includes('LIMITED STOCK'),
        isBestSeller: topSold.includes(s.slug),
        brandId: brandIds.get(s.brandName),
        categoryId: category.id,
        subCategoryId: sub.id,
        metaTitle: `${s.name} | Fairu Fashion`,
        metaDescription: s.shortDescription,
        images: {
          create: s.images.map((img, i) => ({ url: img.url, alt: img.alt, isMain: i === 0, order: i })),
        },
        variants: {
          create: s.variants.map((v) => ({
            name: `Color: ${v.label}`,
            sku: v.sku,
            stock: v.stock,
            attribute1Name: 'Color',
            attribute1Value: v.label,
          })),
        },
        specifications: {
          create: s.specs.map((g, gi) => ({
            title: g.groupName,
            displayOrder: gi,
            items: { create: g.items.map((it, ii) => ({ key: it.key, value: it.value, displayOrder: ii })) },
          })),
        },
      },
    });
    console.log(`  ✓ ${s.name}`);
  }

  // 4. reviews (demo customers) + rating summary on each product
  console.log('Seeding reviews...');
  const passwordHash = await argon2.hash('Demo@12345');
  const users: string[] = [];
  for (const [i, name] of REVIEWERS.entries()) {
    const email = `reviewer${i + 1}@fairufashion.demo`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash, emailVerified: true },
    });
    users.push(u.id);
  }
  for (const [pi, s] of seeds.entries()) {
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: s.slug } });
    const count = 3 + ((pi * 5) % 6); // 3..8 reviews
    const ratings: number[] = [];
    for (let k = 0; k < count; k++) {
      const [rating, comment] = COMMENTS[(pi + k * 3) % COMMENTS.length];
      ratings.push(rating);
      await prisma.review.create({
        data: {
          rating,
          comment,
          status: 'APPROVED',
          isVerified: k % 3 !== 2,
          helpfulCount: (pi + k * 7) % 19,
          userId: users[(pi + k) % users.length],
          productId: product.id,
          createdAt: new Date(Date.UTC(2026, 6, 1 + ((pi * 3 + k * 11) % 90))),
        },
      });
    }
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    await prisma.product.update({ where: { id: product.id }, data: { avgRating: Math.round(avg * 100) / 100, reviewCount: ratings.length } });
  }

  // 5. demo coupons for the storefront cart
  console.log('Seeding coupons...');
  const validFrom = new Date('2026-01-01T00:00:00Z');
  const validTo = new Date('2027-12-31T23:59:59Z');
  const coupons = [
    { code: 'WELCOME10', description: '10% off your order (up to ৳1,000)', discountType: 'PERCENTAGE' as const, discountValue: 10, minOrderAmount: 1000, maxDiscount: 1000 },
    { code: 'SAVE200', description: '৳200 off orders over ৳3,000', discountType: 'FIXED_AMOUNT' as const, discountValue: 200, minOrderAmount: 3000, maxDiscount: null },
    { code: 'FREESHIP', description: 'Free delivery on any order', discountType: 'FREE_SHIPPING' as const, discountValue: 0, minOrderAmount: null, maxDiscount: null },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { ...c, isActive: true, validFrom, validTo },
      create: { ...c, type: 'PUBLIC', isActive: true, validFrom, validTo },
    });
    console.log(`  ✓ ${c.code}`);
  }

  console.log(`Done: ${seeds.length} products across ${CATEGORY_ORDER.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
