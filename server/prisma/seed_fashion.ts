import 'dotenv/config';
import { PrismaClient, Role, ProductStatus, BrandStatus, CategoryStatus, SubCategoryStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';

let dbUrl = process.env.DATABASE_URL || '';
dbUrl = dbUrl.replace(/&channel_binding=[^&]*/, '');
dbUrl = dbUrl.replace(/\?channel_binding=[^&]*&?/, '?');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  console.log('=== SEEDING FAIRU FASHION DATABASE ===');

  // 1. SEED / UPSERT ADMIN USER
  console.log('1. Seeding Admin User: neyamat7.ullah@gmail.com...');
  const adminPassword = 'Password123!';
  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: 'neyamat7.ullah@gmail.com' },
    update: {
      role: Role.SUPER_ADMIN,
      passwordHash,
      status: 'ACTIVE',
      emailVerified: true,
      name: 'Neyamat Ullah',
    },
    create: {
      email: 'neyamat7.ullah@gmail.com',
      name: 'Neyamat Ullah',
      role: Role.SUPER_ADMIN,
      passwordHash,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  console.log('   ✓ Admin user ready:', admin.email, 'Role:', admin.role);

  // 2. SEED SITE SETTINGS
  console.log('2. Seeding Fairu Fashion Site Settings...');
  await prisma.siteSetting.upsert({
    where: { key: 'site' },
    update: {
      value: JSON.stringify({
        storeName: 'Fairu Fashion',
        tagline: 'Elegance in Every Stitch',
        logoUrl: '/logo-mark.png',
        faviconUrl: '/favicon.png',
        contactEmail: 'neyamat7.ullah@gmail.com',
        hotline: '+880 1700-000000',
        whatsapp: '+880 1700-000000',
        address: 'Dhaka, Bangladesh',
        businessHours: '10:00 AM - 10:00 PM',
        currency: 'BDT',
        currencySymbol: '৳',
        metaTitle: "Fairu Fashion | Elegant Women's Dresses & Wear",
        metaDescription: "Discover exquisite women's three piece, Pakistani lawn, designer dresses, ethnic sarees, modest abayas, and party wear at Fairu Fashion.",
        socialLinks: {},
      }),
    },
    create: {
      key: 'site',
      value: JSON.stringify({
        storeName: 'Fairu Fashion',
        tagline: 'Elegance in Every Stitch',
        logoUrl: '/logo-mark.png',
        faviconUrl: '/favicon.png',
        contactEmail: 'neyamat7.ullah@gmail.com',
        hotline: '+880 1700-000000',
        whatsapp: '+880 1700-000000',
        address: 'Dhaka, Bangladesh',
        businessHours: '10:00 AM - 10:00 PM',
        currency: 'BDT',
        currencySymbol: '৳',
        metaTitle: "Fairu Fashion | Elegant Women's Dresses & Wear",
        metaDescription: "Discover exquisite women's three piece, Pakistani lawn, designer dresses, ethnic sarees, modest abayas, and party wear at Fairu Fashion.",
        socialLinks: {},
      }),
    },
  });
  console.log('   ✓ Site settings saved.');

  // 3. SEED BRANDS
  console.log('3. Seeding Brands...');
  const brandsData = [
    {
      name: 'Zamzam',
      slug: 'zamzam',
      description: 'Iconic Pakistani lawn and luxury embroidered three-piece collection.',
      country: 'Pakistan',
      foundedYear: 2005,
      isHomepage: true,
      displayOrder: 1,
    },
    {
      name: 'Bin Hamid',
      slug: 'bin-hamid',
      description: 'Renowned for exquisite Swiss lawn, embroidered chiffon, and pure cotton three-piece suits.',
      country: 'Pakistan',
      foundedYear: 2008,
      isHomepage: true,
      displayOrder: 2,
    },
    {
      name: 'Noor Jahan',
      slug: 'noor-jahan',
      description: 'Royal luxury party wear, velvet formals, and bridal three-piece ensembles.',
      country: 'Pakistan',
      foundedYear: 2012,
      isHomepage: true,
      displayOrder: 3,
    },
    {
      name: 'Gul Ahmed',
      slug: 'gul-ahmed',
      description: 'Timeless digital prints, premium summer lawn, and festive wear.',
      country: 'Pakistan',
      foundedYear: 1953,
      isHomepage: true,
      displayOrder: 4,
    },
    {
      name: 'Maria B',
      slug: 'maria-b',
      description: 'High-end designer luxury, organza couture, and festive party wear.',
      country: 'Pakistan',
      foundedYear: 1999,
      isHomepage: true,
      displayOrder: 5,
    },
    {
      name: 'Fairu Exclusive',
      slug: 'fairu-exclusive',
      description: 'Signature in-house collection of contemporary dresses, abayas, and handcrafted sarees.',
      country: 'Bangladesh',
      foundedYear: 2024,
      isHomepage: true,
      displayOrder: 6,
    },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { ...b, status: BrandStatus.ACTIVE },
      create: { ...b, status: BrandStatus.ACTIVE },
    });
    brandMap.set(b.name, brand.id);
    console.log(`   ✓ Brand: ${b.name}`);
  }

  // 4. SEED CATEGORIES & SUBCATEGORIES
  console.log('4. Seeding Categories & Subcategories...');
  const categoriesData = [
    {
      name: 'Three Piece Collection',
      slug: 'three-piece-collection',
      description: 'Exclusive unstitched and semi-stitched luxury three-piece suits.',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      isHomepage: true,
      displayOrder: 1,
      subCategories: [
        { name: 'Lawn Three Piece', slug: 'lawn-three-piece' },
        { name: 'Cotton Three Piece', slug: 'cotton-three-piece' },
        { name: 'Embroidered Three Piece', slug: 'embroidered-three-piece' },
        { name: 'Chiffon Dupatta Three Piece', slug: 'chiffon-dupatta-three-piece' },
        { name: 'Party Wear Three Piece', slug: 'party-wear-three-piece' },
      ],
    },
    {
      name: "Women's Dresses",
      slug: 'womens-dresses',
      description: 'Flowing maxi dresses, elegant evening gowns, and chic casual wear.',
      image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      isHomepage: true,
      displayOrder: 2,
      subCategories: [
        { name: 'Maxi Dresses', slug: 'maxi-dresses' },
        { name: 'Midi Dresses', slug: 'midi-dresses' },
        { name: 'Evening Gowns', slug: 'evening-gowns' },
        { name: 'Casual Day Dresses', slug: 'casual-day-dresses' },
      ],
    },
    {
      name: 'Ethnic & Traditional Wear',
      slug: 'ethnic-traditional-wear',
      description: 'Timeless handloom sarees, designer salwar kameez, and party kurtis.',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      isHomepage: true,
      displayOrder: 3,
      subCategories: [
        { name: 'Sarees', slug: 'sarees' },
        { name: 'Salwar Kameez', slug: 'salwar-kameez' },
        { name: 'Kurtis & Tunics', slug: 'kurtis-tunics' },
        { name: 'Lehengas', slug: 'lehengas' },
      ],
    },
    {
      name: 'Modest Fashion',
      slug: 'modest-fashion',
      description: 'Premium Dubai cherry georgette abayas, hijabs, and stylish kaftans.',
      image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80',
      icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
      isHomepage: true,
      displayOrder: 4,
      subCategories: [
        { name: 'Abayas', slug: 'abayas' },
        { name: 'Hijabs & Scarves', slug: 'hijabs-scarves' },
        { name: 'Kaftans', slug: 'kaftans' },
      ],
    },
    {
      name: 'Western Tops & Co-Ords',
      slug: 'western-tops-co-ords',
      description: 'Trendsetting co-ord sets, stylish tops, and modern silhouettes.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      isHomepage: true,
      displayOrder: 5,
      subCategories: [
        { name: 'Two-Piece Co-ord Sets', slug: 'two-piece-co-ord-sets' },
        { name: 'Tops & Blouses', slug: 'tops-blouses' },
      ],
    },
  ];

  const catMap = new Map<string, { id: string; name: string }>();
  const subMap = new Map<string, { id: string; name: string }>();

  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        image: c.image,
        icon: c.icon,
        isHomepage: c.isHomepage,
        displayOrder: c.displayOrder,
        status: CategoryStatus.ACTIVE,
      },
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        icon: c.icon,
        isHomepage: c.isHomepage,
        displayOrder: c.displayOrder,
        status: CategoryStatus.ACTIVE,
      },
    });
    catMap.set(c.slug, { id: cat.id, name: cat.name });
    console.log(`   ✓ Category: ${cat.name}`);

    for (const s of c.subCategories) {
      const sub = await prisma.subCategory.upsert({
        where: { slug: s.slug },
        update: {
          name: s.name,
          parentCategoryId: cat.id,
          status: SubCategoryStatus.ACTIVE,
        },
        create: {
          name: s.name,
          slug: s.slug,
          parentCategoryId: cat.id,
          status: SubCategoryStatus.ACTIVE,
        },
      });
      subMap.set(s.slug, { id: sub.id, name: sub.name });
    }
  }

  // 5. SEED PRODUCTS (WITH ZAMZAM, BIN HAMID, AND POPULAR THREE PIECES)
  console.log('5. Seeding Women Dresses & Three Piece Products...');

  const productsData = [
    {
      name: 'Zamzam Premium Embroidered Lawn Three Piece - Floral Blush',
      slug: 'zamzam-premium-embroidered-lawn-three-piece-floral-blush',
      productCode: 'ZZ-L24-01',
      brandName: 'Zamzam',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'lawn-three-piece',
      price: 3250,
      regularPrice: 3800,
      originalPrice: 3800,
      buyingPrice: 2400,
      stock: 45,
      shortDescription: 'Exquisite 100% fine cotton lawn kameez with heavy embroidered neckline, printed back and sleeves, paired with a dyed trouser and luxury pure chiffon dupatta.',
      description: 'Elevate your daytime elegance with the Zamzam Premium Embroidered Lawn Three Piece. Cut from silky-smooth 90/70 combed cotton lawn, this unstitched ensemble features intricate threadwork along the gala and daman borders. The printed pure chiffon dupatta cascades effortlessly, offering breathable sophistication for social gatherings and festive luncheons.',
      isFeatured: true,
      isBestSeller: true,
      isHot: true,
      isNew: true,
      badges: ['HOT', 'BEST SELLER'],
      inTheBox: ['1x Embroidered Lawn Shirt (3m)', '1x Dyed Cotton Trouser (2.5m)', '1x Pure Chiffon Dupatta (2.5m)', 'Embroidered Border Patch'],
      images: [
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Zamzam Premium Embroidered Lawn Three Piece - Front View', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Zamzam Premium Embroidered Lawn Three Piece - Dupatta Details', isPrimary: false },
        { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Zamzam Premium Embroidered Lawn Three Piece - Fabric View', isPrimary: false },
      ],
      variants: [
        { label: 'Blush Pink', sku: 'ZZ-L24-01-BP', stock: 20 },
        { label: 'Mint Green', sku: 'ZZ-L24-01-MG', stock: 15 },
        { label: 'Lilac Mist', sku: 'ZZ-L24-01-LM', stock: 10 },
      ],
      specs: [
        { groupName: 'Fabric Details', items: [{ key: 'Shirt Fabric', value: '100% Cotton Lawn (90/70)' }, { key: 'Dupatta Fabric', value: 'Pure Printed Chiffon' }, { key: 'Trouser Fabric', value: 'Dyed Cambric Cotton' }] },
        { groupName: 'Design & Work', items: [{ key: 'Embroidery', value: 'Heavy Resham Threadwork & Dori' }, { key: 'Stitch Type', value: 'Unstitched 3-Piece' }, { key: 'Length', value: 'Kameez 48 inches max' }] },
      ],
    },
    {
      name: 'Zamzam Luxury Digital Voile Three Piece - Crimson Rose',
      slug: 'zamzam-luxury-digital-voile-three-piece-crimson-rose',
      productCode: 'ZZ-V24-02',
      brandName: 'Zamzam',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'cotton-three-piece',
      price: 2950,
      regularPrice: 3400,
      originalPrice: 3400,
      buyingPrice: 2100,
      stock: 60,
      shortDescription: 'High-density digital printed cotton voile three-piece with delicate sequence work on daman, pure lawn printed dupatta, and breathable cotton salwar.',
      description: 'Bold, expressive, and undeniably regal. This Zamzam Digital Voile set pairs vivid floral motifs with soft micro-sequin embellishments that catch the light delicately. The ultra-light voile fabric guarantees zero transparency while keeping you perfectly cool under the warm sun.',
      isFeatured: true,
      isBestSeller: true,
      isHot: true,
      isNew: false,
      badges: ['BEST SELLER'],
      inTheBox: ['1x Digital Voile Kameez (3m)', '1x Cotton Salwar (2.5m)', '1x Soft Voile Dupatta (2.5m)'],
      images: [
        { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Zamzam Digital Voile Three Piece - Crimson', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Zamzam Digital Voile Detail', isPrimary: false },
      ],
      variants: [
        { label: 'Crimson Red', sku: 'ZZ-V24-02-CR', stock: 25 },
        { label: 'Royal Blue', sku: 'ZZ-V24-02-RB', stock: 20 },
        { label: 'Mustard Gold', sku: 'ZZ-V24-02-MG', stock: 15 },
      ],
      specs: [
        { groupName: 'Fabric Details', items: [{ key: 'Kameez Fabric', value: 'High Density Cotton Voile' }, { key: 'Dupatta', value: 'Lawn Voile Print' }, { key: 'Salwar', value: 'Dyed Cotton' }] },
        { groupName: 'Craftsmanship', items: [{ key: 'Printing', value: 'HD Digital Reactive Print' }, { key: 'Embellishment', value: 'Micro-Sequins on Daman' }] },
      ],
    },
    {
      name: 'Bin Hamid Luxury Swiss Lawn Three Piece - Pastel Orchid',
      slug: 'bin-hamid-luxury-swiss-lawn-three-piece-pastel-orchid',
      productCode: 'BH-SL24-01',
      brandName: 'Bin Hamid',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'lawn-three-piece',
      price: 3450,
      regularPrice: 4000,
      originalPrice: 4000,
      buyingPrice: 2500,
      stock: 35,
      shortDescription: 'Iconic Bin Hamid luxury Swiss lawn collection featuring multi-head resham embroidery on shirt front, matching dyed trouser with embroidered patch, and printed bamberg chiffon dupatta.',
      description: 'Renowned throughout South Asia for impeccable fabric quality, Bin Hamid presents the Pastel Orchid edition. Woven from Egyptian cotton yarns with a subtle Swiss-finish sheen, the ensemble is complemented by intricate tone-on-tone embroidery and a breezy Bamberg chiffon dupatta.',
      isFeatured: true,
      isBestSeller: true,
      isHot: true,
      isNew: true,
      badges: ['HOT', 'NEW'],
      inTheBox: ['1x Swiss Lawn Embroidered Shirt (3.1m)', '1x Dyed Trouser (2.5m)', '1x Bamberg Chiffon Dupatta (2.5m)', 'Organza Embroidered Trouser Patch'],
      images: [
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Bin Hamid Luxury Swiss Lawn - Front View', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Bin Hamid Swiss Lawn - Dupatta', isPrimary: false },
      ],
      variants: [
        { label: 'Pastel Orchid', sku: 'BH-SL24-01-PO', stock: 15 },
        { label: 'Peach Rose', sku: 'BH-SL24-01-PR', stock: 10 },
        { label: 'Sky Azure', sku: 'BH-SL24-01-SA', stock: 10 },
      ],
      specs: [
        { groupName: 'Fabric Details', items: [{ key: 'Shirt', value: '100% Swiss Lawn Cotton' }, { key: 'Dupatta', value: 'Bamberg Chiffon' }, { key: 'Bottom', value: 'Cotton Cambric' }] },
        { groupName: 'Care', items: [{ key: 'Washing', value: 'Gentle Machine Wash or Hand Wash' }, { key: 'Ironing', value: 'Medium Heat' }] },
      ],
    },
    {
      name: 'Bin Hamid Heavy Embroidered Chiffon Three Piece - Midnight Sapphire',
      slug: 'bin-hamid-heavy-embroidered-chiffon-three-piece-midnight-sapphire',
      productCode: 'BH-CH24-03',
      brandName: 'Bin Hamid',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'chiffon-dupatta-three-piece',
      price: 4500,
      regularPrice: 5200,
      originalPrice: 5200,
      buyingPrice: 3300,
      stock: 25,
      shortDescription: 'Elegant formal wear three-piece with fully embroidered chiffon front and back, hand-embellished pearls on gala, dyed malai crepe trousers, and heavily embroidered pallu dupatta.',
      description: 'Make a breathtaking entrance at evening weddings and parties. This Bin Hamid formal three-piece features dense floral needlework on soft crinkle chiffon, accented by delicate faux pearls and zari borders. Comes with matching soft inner lining fabric.',
      isFeatured: true,
      isBestSeller: false,
      isHot: true,
      isNew: true,
      badges: ['HOT'],
      inTheBox: ['1x Embroidered Chiffon Shirt (Front, Back, Sleeves)', '1x Embroidered Chiffon Dupatta (2.5m)', '1x Malai Crepe Trouser (2.5m)', '1x Inner Lining (2m)'],
      images: [
        { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Bin Hamid Chiffon Three Piece - Midnight', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Bin Hamid Chiffon Three Piece - Detail', isPrimary: false },
      ],
      variants: [
        { label: 'Midnight Sapphire', sku: 'BH-CH24-03-MS', stock: 12 },
        { label: 'Jet Black', sku: 'BH-CH24-03-JB', stock: 8 },
        { label: 'Deep Maroon', sku: 'BH-CH24-03-DM', stock: 5 },
      ],
      specs: [
        { groupName: 'Fabric Details', items: [{ key: 'Shirt & Dupatta', value: 'Pure Crinkle Chiffon' }, { key: 'Bottom & Lining', value: 'Soft Malai Crepe' }] },
        { groupName: 'Work Details', items: [{ key: 'Embroidery', value: 'Zari, Resham & Pearl Handwork' }, { key: 'Occasion', value: 'Wedding & Evening Festive' }] },
      ],
    },
    {
      name: 'Bin Hamid Pure Cotton Daily Wear Three Piece - Sunlit Ochre',
      slug: 'bin-hamid-pure-cotton-daily-wear-three-piece-sunlit-ochre',
      productCode: 'BH-PC24-04',
      brandName: 'Bin Hamid',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'cotton-three-piece',
      price: 2650,
      regularPrice: 3100,
      originalPrice: 3100,
      buyingPrice: 1900,
      stock: 50,
      shortDescription: 'Breathable premium combed cotton 3-piece designed for comfort and everyday grace. Fast colors, shrink-resistant fabric with matching lawn dupatta.',
      description: 'Designed for daily routines, office wear, and casual outings. Featuring a soothing geometric-floral combination on premium 100% pure cotton, finished with a generous 2.5-meter cotton dupatta that drapes with ease.',
      isFeatured: false,
      isBestSeller: true,
      isHot: false,
      isNew: false,
      badges: ['BEST SELLER'],
      inTheBox: ['1x Pure Cotton Shirt (2.8m)', '1x Pure Cotton Salwar (2.5m)', '1x Soft Cotton Dupatta (2.5m)'],
      images: [
        { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Bin Hamid Daily Cotton Three Piece', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Bin Hamid Daily Cotton Detail', isPrimary: false },
      ],
      variants: [
        { label: 'Sunlit Ochre', sku: 'BH-PC24-04-SO', stock: 20 },
        { label: 'Soft Coral', sku: 'BH-PC24-04-SC', stock: 15 },
        { label: 'Olive Mist', sku: 'BH-PC24-04-OM', stock: 15 },
      ],
      specs: [
        { groupName: 'Fabric Details', items: [{ key: 'Material', value: '100% Combed Cotton' }, { key: 'Color Fastness', value: 'Guaranteed Vat Dye' }] },
      ],
    },
    {
      name: 'Noor Jahan Designer Velvet Embroidered Three Piece - Royal Ruby',
      slug: 'noor-jahan-designer-velvet-embroidered-three-piece-royal-ruby',
      productCode: 'NJ-V24-01',
      brandName: 'Noor Jahan',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'party-wear-three-piece',
      price: 5800,
      regularPrice: 6800,
      originalPrice: 6800,
      buyingPrice: 4200,
      stock: 20,
      shortDescription: 'Micro-velvet kameez adorned with tilla embroidery and zari work, paired with jamawar trousers and organza dupatta with four-sided embroidered borders.',
      description: 'Rich royal micro-velvet tailored for winter weddings and grand receptions. Intricately finished with antique gold tilla and zardozi threadwork across the neckline, sleeves, and hemline.',
      isFeatured: true,
      isBestSeller: false,
      isHot: true,
      isNew: true,
      badges: ['HOT', 'LIMITED STOCK'],
      inTheBox: ['1x Micro Velvet Kameez', '1x Jamawar Trouser', '1x Organza Embroidered Dupatta'],
      images: [
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Noor Jahan Velvet Three Piece', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Noor Jahan Velvet Detail', isPrimary: false },
      ],
      variants: [
        { label: 'Royal Ruby', sku: 'NJ-V24-01-RR', stock: 10 },
        { label: 'Bottle Green', sku: 'NJ-V24-01-BG', stock: 5 },
        { label: 'Midnight Navy', sku: 'NJ-V24-01-MN', stock: 5 },
      ],
      specs: [
        { groupName: 'Fabric Details', items: [{ key: 'Shirt Fabric', value: 'Micro 9000 Velvet' }, { key: 'Dupatta', value: 'Organza with Zari Borders' }] },
      ],
    },
    {
      name: 'Gul Ahmed Digital Lawn Three Piece with Chiffon Dupatta - Summer Breeze',
      slug: 'gul-ahmed-digital-lawn-three-piece-chiffon-dupatta-summer-breeze',
      productCode: 'GA-DL24-05',
      brandName: 'Gul Ahmed',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'lawn-three-piece',
      price: 3200,
      regularPrice: 3600,
      originalPrice: 3600,
      buyingPrice: 2350,
      stock: 40,
      shortDescription: 'Authentic Gul Ahmed summer lawn three-piece featuring dynamic geometric & floral prints, premium dyed trousers, and feather-light printed chiffon dupatta.',
      description: 'The definitive summer luxury staple from Gul Ahmed. Woven with extra-long staple cotton yarns for unparalleled softness and drape. Includes an airy printed chiffon dupatta that complements the vibrant palette.',
      isFeatured: false,
      isBestSeller: true,
      isHot: false,
      isNew: true,
      badges: ['NEW'],
      inTheBox: ['1x Printed Lawn Shirt (3m)', '1x Dyed Cotton Trouser (2.5m)', '1x Printed Chiffon Dupatta (2.5m)'],
      images: [
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Gul Ahmed Lawn Three Piece', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Gul Ahmed Detail', isPrimary: false },
      ],
      variants: [
        { label: 'Coral Pink', sku: 'GA-DL24-05-CP', stock: 15 },
        { label: 'Aqua Turquoise', sku: 'GA-DL24-05-AT', stock: 15 },
        { label: 'Lemon Zest', sku: 'GA-DL24-05-LZ', stock: 10 },
      ],
      specs: [
        { groupName: 'Fabric Details', items: [{ key: 'Fabric', value: 'Premium Lawn (80/80)' }, { key: 'Dupatta', value: 'Silk Chiffon' }] },
      ],
    },
    {
      name: 'Maria B Luxury Organza Party Wear Three Piece - Champagne Glow',
      slug: 'maria-b-luxury-organza-party-wear-three-piece-champagne-glow',
      productCode: 'MB-OP24-02',
      brandName: 'Maria B',
      categorySlug: 'three-piece-collection',
      subCategorySlug: 'party-wear-three-piece',
      price: 6500,
      regularPrice: 7500,
      originalPrice: 7500,
      buyingPrice: 4800,
      stock: 18,
      shortDescription: 'Luxurious organza fabric with silver zardozi embroidery, sequence motifs, raw silk trousers with lace trims, and ready-to-wear embroidered dupatta.',
      description: 'A masterpiece from Maria B. Crafted on crystalline soft organza with hand-done zardozi, kora, and sequin craftsmanship. Paired with pure raw silk bottoms and a four-sided scolloped dupatta.',
      isFeatured: true,
      isBestSeller: true,
      isHot: true,
      isNew: true,
      badges: ['HOT', 'LIMITED STOCK'],
      inTheBox: ['1x Embroidered Organza Shirt', '1x Raw Silk Bottom', '1x Scalloped Organza Dupatta', 'Silk Slip Lining'],
      images: [
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Maria B Organza Three Piece', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Maria B Organza Details', isPrimary: false },
      ],
      variants: [
        { label: 'Champagne Glow', sku: 'MB-OP24-02-CG', stock: 8 },
        { label: 'Rose Gold', sku: 'MB-OP24-02-RG', stock: 6 },
        { label: 'Ice Blue', sku: 'MB-OP24-02-IB', stock: 4 },
      ],
      specs: [
        { groupName: 'Material', items: [{ key: 'Fabric', value: 'High Grade Poly Organza' }, { key: 'Bottom', value: 'Dyed Raw Silk' }] },
      ],
    },
    {
      name: 'Fairu Signature Chiffon Tiered Maxi Dress - Blossom Pink',
      slug: 'fairu-signature-chiffon-tiered-maxi-dress-blossom-pink',
      productCode: 'FF-MD24-01',
      brandName: 'Fairu Exclusive',
      categorySlug: 'womens-dresses',
      subCategorySlug: 'maxi-dresses',
      price: 2850,
      regularPrice: 3400,
      originalPrice: 3400,
      buyingPrice: 1950,
      stock: 30,
      shortDescription: 'Flowing bohemian maxi dress crafted from airy pleated chiffon with smocked waist, bishop sleeves, and delicate floral print. Lined with soft breathable cotton.',
      description: 'The epitome of graceful femininity. Designed by Fairu Fashion with romantic tiered flares, a cinched elasticated smocked waist, and billowy bishop cuffs. Perfect for weekend getaways, photoshoots, and dinner dates.',
      isFeatured: true,
      isBestSeller: true,
      isHot: false,
      isNew: true,
      badges: ['HOT'],
      inTheBox: ['1x Chiffon Tiered Maxi Dress with Belt'],
      images: [
        { url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Fairu Chiffon Maxi Dress', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Fairu Maxi Dress Detail', isPrimary: false },
      ],
      variants: [
        { label: 'Blossom Pink / S', sku: 'FF-MD24-01-BP-S', stock: 10 },
        { label: 'Blossom Pink / M', sku: 'FF-MD24-01-BP-M', stock: 10 },
        { label: 'Blossom Pink / L', sku: 'FF-MD24-01-BP-L', stock: 10 },
      ],
      specs: [
        { groupName: 'Fit & Material', items: [{ key: 'Fabric', value: 'Georgette Chiffon with Cotton Lining' }, { key: 'Length', value: '54 inches' }, { key: 'Sleeve', value: 'Full Bishop Sleeve' }] },
      ],
    },
    {
      name: 'Fairu Dubai Cherry Georgette Embroidered Abaya - Noir Elegance',
      slug: 'fairu-dubai-cherry-georgette-embroidered-abaya-noir-elegance',
      productCode: 'FF-AB24-01',
      brandName: 'Fairu Exclusive',
      categorySlug: 'modest-fashion',
      subCategorySlug: 'abayas',
      price: 3850,
      regularPrice: 4500,
      originalPrice: 4500,
      buyingPrice: 2600,
      stock: 25,
      shortDescription: 'Front-open luxury Dubai cherry georgette abaya with hand-stitched crystal stonework on cuffs and lapels. Comes with matching premium chiffon hijab.',
      description: 'Crafted from authentic high-weight Dubai Cherry Georgette with an exquisite drape that does not crease. Features modest snap-button front closure and delicate crystal motifs along the sleeves.',
      isFeatured: true,
      isBestSeller: true,
      isHot: true,
      isNew: false,
      badges: ['BEST SELLER'],
      inTheBox: ['1x Dubai Cherry Abaya', '1x Matching Georgette Hijab', '1x Fabric Tie Belt'],
      images: [
        { url: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Fairu Dubai Abaya Noir', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Fairu Dubai Abaya Details', isPrimary: false },
      ],
      variants: [
        { label: 'Classic Black / 52', sku: 'FF-AB24-01-CB-52', stock: 8 },
        { label: 'Classic Black / 54', sku: 'FF-AB24-01-CB-54', stock: 10 },
        { label: 'Classic Black / 56', sku: 'FF-AB24-01-CB-56', stock: 7 },
      ],
      specs: [
        { groupName: 'Garment Details', items: [{ key: 'Fabric', value: 'Original Dubai Cherry Georgette' }, { key: 'Cut', value: 'Flared A-Line Front Open' }] },
      ],
    },
    {
      name: 'Traditional Dhakai Jamdani Handloom Saree - Crimson Heritage',
      slug: 'traditional-dhakai-jamdani-handloom-saree-crimson-heritage',
      productCode: 'FF-SR24-01',
      brandName: 'Fairu Exclusive',
      categorySlug: 'ethnic-traditional-wear',
      subCategorySlug: 'sarees',
      price: 4200,
      regularPrice: 5000,
      originalPrice: 5000,
      buyingPrice: 2900,
      stock: 22,
      shortDescription: 'Authentic handwoven Jamdani cotton-silk saree with traditional floral panna motifs, woven pallu, and running blouse piece.',
      description: 'A tribute to centuries of Bangladeshi weaving heritage. Each motif is woven by hand on traditional wooden pit looms with fine cotton-silk counts, yielding an airy texture that drapes into immaculate pleats.',
      isFeatured: true,
      isBestSeller: false,
      isHot: true,
      isNew: true,
      badges: ['HOT', 'NEW'],
      inTheBox: ['1x Handloom Jamdani Saree with Running Blouse Piece (6.2m)'],
      images: [
        { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Dhakai Jamdani Saree', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Dhakai Jamdani Details', isPrimary: false },
      ],
      variants: [
        { label: 'Crimson & Gold', sku: 'FF-SR24-01-CG', stock: 10 },
        { label: 'Royal Blue & Silver', sku: 'FF-SR24-01-RS', stock: 7 },
        { label: 'Pearl White & Red', sku: 'FF-SR24-01-WR', stock: 5 },
      ],
      specs: [
        { groupName: 'Weave Details', items: [{ key: 'Weave', value: 'Authentic Handloom Jamdani' }, { key: 'Fabric', value: 'Cotton Silk Blend (84 count)' }, { key: 'Length', value: '12 Haat with Blouse' }] },
      ],
    },
    {
      name: 'Designer Embroidered Kurti & Palazzo Co-ord Set - Teal Bloom',
      slug: 'designer-embroidered-kurti-palazzo-co-ord-set-teal-bloom',
      productCode: 'FF-CD24-01',
      brandName: 'Fairu Exclusive',
      categorySlug: 'western-tops-co-ords',
      subCategorySlug: 'two-piece-co-ord-sets',
      price: 2200,
      regularPrice: 2600,
      originalPrice: 2600,
      buyingPrice: 1500,
      stock: 35,
      shortDescription: 'Contemporary 2-piece co-ord set with embroidered Mandarin collar kurti and relaxed-fit wide-leg palazzo pants.',
      description: 'Modern fusion fashion at its finest. Cut from breathable modal rayon with intricate cord embroidery on the placket and side slits. Paired with high-waisted elasticated palazzo pants for all-day comfort.',
      isFeatured: false,
      isBestSeller: true,
      isHot: false,
      isNew: true,
      badges: ['BEST SELLER'],
      inTheBox: ['1x Embroidered Kurti', '1x Matching Palazzo Pants'],
      images: [
        { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Kurti Palazzo Co-ord Set', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&h=1000&q=80', alt: 'Kurti Co-ord Details', isPrimary: false },
      ],
      variants: [
        { label: 'Teal Blue / M', sku: 'FF-CD24-01-TB-M', stock: 15 },
        { label: 'Teal Blue / L', sku: 'FF-CD24-01-TB-L', stock: 12 },
        { label: 'Teal Blue / XL', sku: 'FF-CD24-01-TB-XL', stock: 8 },
      ],
      specs: [
        { groupName: 'Fabric', items: [{ key: 'Material', value: 'Premium Modal Rayon' }, { key: 'Fit', value: 'Straight Relaxed Fit' }] },
      ],
    },
  ];

  for (const p of productsData) {
    const brandId = brandMap.get(p.brandName);
    const categoryInfo = catMap.get(p.categorySlug);
    const subCategoryInfo = subMap.get(p.subCategorySlug);

    if (!categoryInfo || !subCategoryInfo) {
      console.warn(`Category not found for product: ${p.name}`);
      continue;
    }

    // Delete existing product with same slug to cleanly replace images, variants, specs
    await prisma.product.deleteMany({ where: { slug: p.slug } });

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        productCode: p.productCode,
        description: p.description,
        shortDescription: p.shortDescription,
        brandId,
        brandName: p.brandName,
        categoryId: categoryInfo.id,
        categoryName: categoryInfo.name,
        subCategoryId: subCategoryInfo.id,
        subCategoryName: subCategoryInfo.name,
        priceBeforeDiscount: p.originalPrice,
        regularPrice: p.regularPrice,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.price,
        discountPrice: p.price < p.originalPrice ? p.price : null,
        stock: p.stock,
        isFeatured: p.isFeatured,
        isBestSeller: p.isBestSeller,
        isHot: p.isHot,
        isNew: p.isNew,
        inTheBox: JSON.stringify(p.inTheBox),
        metaTitle: `${p.name} | Fairu Fashion`,
        metaDescription: p.shortDescription,
        status: ProductStatus.ACTIVE,
        images: {
          create: p.images.map((img, idx) => ({
            url: img.url,
            alt: img.alt,
            isMain: img.isPrimary,
            order: idx,
          })),
        },
        variants: {
          create: p.variants.map((v) => ({
            name: v.label,
            sku: v.sku,
            stock: v.stock,
            attribute1Name: 'Option',
            attribute1Value: v.label,
          })),
        },
        specifications: {
          create: p.specs.map((group, gIdx) => ({
            title: group.groupName,
            displayOrder: gIdx,
            items: {
              create: group.items.map((item, iIdx) => ({
                key: item.key,
                value: item.value,
                displayOrder: iIdx,
              })),
            },
          })),
        },
      },
    });

    console.log(`   ✓ Product created: ${product.name}`);
  }

  console.log('\n=== FAIRU FASHION SEEDING COMPLETED SUCCESSFULLY! ===');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
