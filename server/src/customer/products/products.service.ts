import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { Prisma } from '@prisma/client';
import {
  ProductQueryDto,
  ProductScopeDto,
  SectionQueryDto,
} from './dto/product-query.dto';
import {
  buildOrderBy,
  buildProductWhere,
  buildScopeWhere,
  facetValueCompare,
} from './product-filters';

const productInclude = {
  images: { orderBy: { order: 'asc' as const } },
  variants: true,
  specifications: {
    include: { items: { orderBy: { displayOrder: 'asc' as const } } },
    orderBy: { displayOrder: 'asc' as const },
  },
  brand: true,
  category: true,
  subCategory: true,
  tags: true,
  priceHistory: { orderBy: { recordedAt: 'desc' as const }, take: 30 },
} satisfies Prisma.ProductInclude;

// Lightweight product shape for grids, carousels and home sections.
export const cardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  sellingPrice: true,
  regularPrice: true,
  stock: true,
  avgRating: true,
  reviewCount: true,
  totalSales: true,
  isNew: true,
  isHot: true,
  isFeatured: true,
  isBestSeller: true,
  freeShipping: true,
  createdAt: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  _count: { select: { variants: true } },
  images: {
    orderBy: [{ isMain: 'desc' as const }, { order: 'asc' as const }],
    take: 2,
    select: { url: true, alt: true },
  },
} satisfies Prisma.ProductSelect;

export type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export function toCard(p: CardRow) {
  const price = Number(p.sellingPrice);
  const regular = Number(p.regularPrice);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    price,
    regularPrice: regular,
    discountPercent:
      regular > price && regular > 0
        ? Math.round(((regular - price) / regular) * 100)
        : 0,
    inStock: p.stock > 0,
    stock: p.stock,
    avgRating: Number(p.avgRating ?? 0),
    reviewCount: p.reviewCount,
    isNew: p.isNew,
    isHot: p.isHot,
    isFeatured: p.isFeatured,
    isBestSeller: p.isBestSeller,
    freeShipping: p.freeShipping,
    hasVariants: p._count.variants > 0,
    brand: p.brand,
    category: p.category,
    image: p.images[0]?.url ?? null,
    hoverImage: p.images[1]?.url ?? null,
  };
}

// Public product shape: the full row minus what only the shop owner may see
// (cost price, margin, stock alert level, backorder setting).
export function toPublicProduct<
  T extends {
    buyingPrice?: unknown;
    profitMargin?: unknown;
    lowStockThreshold?: unknown;
    allowBackorder?: unknown;
  },
>(p: T) {
  const {
    buyingPrice: _buyingPrice,
    profitMargin: _profitMargin,
    lowStockThreshold: _lowStockThreshold,
    allowBackorder: _allowBackorder,
    ...rest
  } = p;
  void _buyingPrice;
  void _profitMargin;
  void _lowStockThreshold;
  void _allowBackorder;
  return rest;
}

const MAX_FACET_ROWS = 20000;
const MAX_VALUES_PER_FACET = 50;
const FACETS_TTL = 300;
const SECTIONS_TTL = 300;

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = buildProductWhere(
      query,
      this.prisma.product.fields.regularPrice,
    );

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: buildOrderBy(query.sortBy),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: data.map(toPublicProduct),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  // Everything a filter sidebar needs for the current category / search:
  // brands, price range, attribute values (RAM, Storage, Color...), rating
  // buckets and availability — each with the number of matching products.
  async getFilters(scope: ProductScopeDto) {
    const key = `products:filters:${JSON.stringify([
      scope.category ?? '',
      scope.subCategory ?? '',
      scope.search?.trim().toLowerCase() ?? '',
    ])}`;
    return this.cache.getOrSet(
      key,
      () => this.computeFilters(scope),
      FACETS_TTL,
    );
  }

  private async computeFilters(scope: ProductScopeDto) {
    const where = buildScopeWhere(scope);
    const onSaleWhere: Prisma.ProductWhereInput = {
      AND: [
        where,
        { sellingPrice: { lt: this.prisma.product.fields.regularPrice } },
      ],
    };

    const [
      total,
      inStock,
      onSale,
      price,
      brandGroups,
      attributes,
      variants,
      ratings,
      tags,
    ] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.count({
        where: { AND: [where, { stock: { gt: 0 } }] },
      }),
      this.prisma.product.count({ where: onSaleWhere }),
      this.prisma.product.aggregate({
        where,
        _min: { sellingPrice: true },
        _max: { sellingPrice: true },
      }),
      this.prisma.product.groupBy({
        by: ['brandId'],
        where: { AND: [where, { brandId: { not: null } }] },
        _count: { _all: true },
      }),
      this.prisma.productAttributeValue.findMany({
        where: { product: where },
        select: { productId: true, name: true, value: true },
        take: MAX_FACET_ROWS,
      }),
      this.prisma.productVariant.findMany({
        where: { product: where },
        select: {
          productId: true,
          attribute1Name: true,
          attribute1Value: true,
          attribute2Name: true,
          attribute2Value: true,
          attribute3Name: true,
          attribute3Value: true,
        },
        take: MAX_FACET_ROWS,
      }),
      Promise.all(
        [4, 3, 2, 1].map(async (min) => ({
          minRating: min,
          count: await this.prisma.product.count({
            where: { AND: [where, { avgRating: { gte: min } }] },
          }),
        })),
      ),
      this.prisma.productTag.groupBy({
        by: ['tag'],
        where: { product: where },
        _count: { _all: true },
        orderBy: { _count: { tag: 'desc' } },
        take: 30,
      }),
    ]);

    const brandIds = brandGroups
      .map((g) => g.brandId)
      .filter((id): id is string => !!id);
    const brandRows = brandIds.length
      ? await this.prisma.brand.findMany({
          where: { id: { in: brandIds }, status: 'ACTIVE' },
          select: { id: true, name: true, slug: true, logo: true },
        })
      : [];
    const brandCount = new Map(
      brandGroups.map((g) => [g.brandId, g._count._all]),
    );
    const brands = brandRows
      .map((b) => ({ ...b, count: brandCount.get(b.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    // name (case-insensitive) → value (case-insensitive) → product ids
    const facets = new Map<
      string,
      { name: string; values: Map<string, { value: string; ids: Set<string> }> }
    >();
    const add = (
      productId: string,
      name?: string | null,
      value?: string | null,
    ) => {
      const n = name?.trim();
      const v = value?.trim();
      if (!n || !v) return;
      const facet = facets.get(n.toLowerCase()) ?? {
        name: n,
        values: new Map<string, { value: string; ids: Set<string> }>(),
      };
      const entry = facet.values.get(v.toLowerCase()) ?? {
        value: v,
        ids: new Set<string>(),
      };
      entry.ids.add(productId);
      facet.values.set(v.toLowerCase(), entry);
      facets.set(n.toLowerCase(), facet);
    };
    for (const a of attributes) add(a.productId, a.name, a.value);
    for (const v of variants) {
      add(v.productId, v.attribute1Name, v.attribute1Value);
      add(v.productId, v.attribute2Name, v.attribute2Value);
      add(v.productId, v.attribute3Name, v.attribute3Value);
    }

    const specs = [...facets.values()]
      .map((f) => ({
        name: f.name,
        // Value for the `spec` query param: spec=<name>:<value>
        param: f.name,
        values: [...f.values.values()]
          .map((v) => ({ value: v.value, count: v.ids.size }))
          .sort((a, b) => facetValueCompare(a.value, b.value))
          .slice(0, MAX_VALUES_PER_FACET),
        productCount: new Set([...f.values.values()].flatMap((v) => [...v.ids]))
          .size,
      }))
      // Most widely used attributes first (RAM/Storage before rare ones).
      .sort(
        (a, b) =>
          b.productCount - a.productCount || a.name.localeCompare(b.name),
      );

    return {
      total,
      price: {
        min: Number(price._min.sellingPrice ?? 0),
        max: Number(price._max.sellingPrice ?? 0),
      },
      brands,
      specs,
      ratings,
      tags: tags.map((t) => ({ tag: t.tag, count: t._count._all })),
      availability: { inStock, outOfStock: total - inStock },
      onSale,
    };
  }

  // Autocomplete: best product matches (prefix matches first), plus matching
  // categories and brands.
  async suggestions(rawQ: string, limit = 6) {
    const q = rawQ.trim().replace(/\s+/g, ' ');
    if (q.length < 1)
      return { query: q, products: [], categories: [], brands: [] };

    return this.cache.getOrSet(
      `products:suggest:${limit}:${q.toLowerCase()}`,
      async () => {
        const ci = 'insensitive' as const;
        const [products, categories, subCategories, brands] = await Promise.all(
          [
            this.prisma.product.findMany({
              where: {
                status: 'ACTIVE',
                OR: [
                  { name: { contains: q, mode: ci } },
                  { brandName: { contains: q, mode: ci } },
                  { productCode: { equals: q, mode: ci } },
                  { tags: { some: { tag: { contains: q, mode: ci } } } },
                ],
              },
              select: cardSelect,
              orderBy: [{ totalSales: 'desc' }, { id: 'asc' }],
              take: 30,
            }),
            this.prisma.category.findMany({
              where: { status: 'ACTIVE', name: { contains: q, mode: ci } },
              select: { name: true, slug: true, image: true },
              take: 4,
            }),
            this.prisma.subCategory.findMany({
              where: {
                status: 'ACTIVE',
                name: { contains: q, mode: ci },
                parentCategory: { status: 'ACTIVE' },
              },
              select: {
                name: true,
                slug: true,
                parentCategory: { select: { name: true, slug: true } },
              },
              take: 4,
            }),
            this.prisma.brand.findMany({
              where: { status: 'ACTIVE', name: { contains: q, mode: ci } },
              select: { name: true, slug: true, logo: true },
              take: 4,
            }),
          ],
        );

        const lower = q.toLowerCase();
        const rank = (name: string) => {
          const n = name.toLowerCase();
          if (n === lower) return 0;
          if (n.startsWith(lower)) return 1;
          if (n.split(/\s+/).some((w) => w.startsWith(lower))) return 2;
          return 3;
        };
        const ranked = products
          .map((p, i) => ({ p, r: rank(p.name), i }))
          .sort((a, b) => a.r - b.r || a.i - b.i)
          .slice(0, limit)
          .map(({ p }) => toCard(p));

        return {
          query: q,
          products: ranked,
          categories,
          subCategories,
          brands,
        };
      },
      60,
    );
  }

  newArrivals(q: SectionQueryDto) {
    return this.section('new', q, {}, [{ createdAt: 'desc' }, { id: 'asc' }]);
  }

  bestSellers(q: SectionQueryDto) {
    return this.section(
      'best',
      q,
      { OR: [{ totalSales: { gt: 0 } }, { isBestSeller: true }] },
      [{ isBestSeller: 'desc' }, { totalSales: 'desc' }, { id: 'asc' }],
    );
  }

  // Discounted products, biggest discount (%) first.
  async onSale(q: SectionQueryDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 12;
    return this.cache.getOrSet(
      `products:section:sale:${q.category ?? ''}:${page}:${limit}`,
      async () => {
        const categoryFilter = q.category
          ? Prisma.sql`AND p."categoryId" IN (SELECT c.id FROM "Category" c WHERE c.slug = ${q.category})`
          : Prisma.empty;
        const [rows, countRows] = await Promise.all([
          this.prisma.$queryRaw<{ id: string }[]>`
            SELECT p.id FROM "Product" p
            WHERE p.status = 'ACTIVE' AND p."sellingPrice" < p."regularPrice" ${categoryFilter}
            ORDER BY (p."regularPrice" - p."sellingPrice") / NULLIF(p."regularPrice", 0) DESC, p.id
            LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
          this.prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint AS count FROM "Product" p
            WHERE p.status = 'ACTIVE' AND p."sellingPrice" < p."regularPrice" ${categoryFilter}`,
        ]);
        const ids = rows.map((r) => r.id);
        const products = ids.length
          ? await this.prisma.product.findMany({
              where: { id: { in: ids } },
              select: cardSelect,
            })
          : [];
        const byId = new Map(products.map((p) => [p.id, p]));
        const total = Number(countRows[0]?.count ?? 0);
        return {
          data: ids
            .map((id) => byId.get(id))
            .filter((p): p is CardRow => !!p)
            .map(toCard),
          meta: this.meta(total, page, limit),
        };
      },
      SECTIONS_TTL,
    );
  }

  // Everything the home page needs in one request.
  async home() {
    return this.cache.getOrSet(
      'products:home',
      async () => {
        const first = { page: 1, limit: 10 };
        const [featured, newArrivals, bestSellers, onSale, categories, brands] =
          await Promise.all([
            this.prisma.product.findMany({
              where: { status: 'ACTIVE', isFeatured: true },
              select: cardSelect,
              orderBy: [{ totalSales: 'desc' }, { id: 'asc' }],
              take: 10,
            }),
            this.newArrivals(first),
            this.bestSellers(first),
            this.onSale(first),
            this.homeCategories(),
            this.prisma.brand.findMany({
              where: { status: 'ACTIVE', isHomepage: true },
              select: { name: true, slug: true, logo: true },
              orderBy: { name: 'asc' },
              take: 20,
            }),
          ]);
        return {
          featured: featured.map(toCard),
          newArrivals: newArrivals.data,
          bestSellers: bestSellers.data,
          onSale: onSale.data,
          categories,
          brands,
        };
      },
      SECTIONS_TTL,
    );
  }

  private async homeCategories() {
    const select = {
      id: true,
      name: true,
      slug: true,
      image: true,
      icon: true,
      subCategories: {
        where: { status: 'ACTIVE' as const },
        orderBy: { displayOrder: 'asc' as const },
        select: { name: true, slug: true, image: true, icon: true },
      },
    } satisfies Prisma.CategorySelect;
    const flagged = await this.prisma.category.findMany({
      where: { status: 'ACTIVE', isHomepage: true },
      select,
      orderBy: { displayOrder: 'asc' },
    });
    if (flagged.length) return flagged;
    // Nothing marked for the home page yet: show the first active ones.
    return this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select,
      orderBy: { displayOrder: 'asc' },
      take: 8,
    });
  }

  private async section(
    name: string,
    q: SectionQueryDto,
    extra: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
  ) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 12;
    return this.cache.getOrSet(
      `products:section:${name}:${q.category ?? ''}:${page}:${limit}`,
      async () => {
        const where: Prisma.ProductWhereInput = {
          AND: [
            { status: 'ACTIVE' },
            q.category ? { category: { slug: q.category } } : {},
            extra,
          ],
        };
        const [rows, total] = await Promise.all([
          this.prisma.product.findMany({
            where,
            select: cardSelect,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
          }),
          this.prisma.product.count({ where }),
        ]);
        return { data: rows.map(toCard), meta: this.meta(total, page, limit) };
      },
      SECTIONS_TTL,
    );
  }

  private meta(total: number, page: number, limit: number) {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug, status: 'ACTIVE' },
      include: {
        ...productInclude,
        reviews: {
          where: { status: 'APPROVED' },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        questions: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        attributes: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    return toPublicProduct(product);
  }

  async getFeatured(limit = 8) {
    const rows = await this.cache.getOrSet(
      `products:featured:${limit}`,
      () =>
        this.prisma.product.findMany({
          where: { status: 'ACTIVE', isFeatured: true },
          include: productInclude,
          orderBy: { totalSales: 'desc' },
          take: limit,
        }),
      300, // 5 minutes TTL
    );
    return rows.map(toPublicProduct);
  }

  async getRelated(productId: string, categoryId: string, limit = 6) {
    const rows = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categoryId,
        id: { not: productId },
      },
      include: productInclude,
      orderBy: { totalSales: 'desc' },
      take: limit,
    });
    return rows.map(toPublicProduct);
  }

  async searchSuggestions(q: string, limit = 6) {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sellingPrice: true,
        images: { where: { isMain: true }, take: 1, select: { url: true } },
      },
      take: limit,
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.sellingPrice,
      image: p.images[0]?.url ?? null,
    }));
  }

  async incrementView(slug: string) {
    return this.prisma.product.update({
      where: { slug },
      data: { totalViews: { increment: 1 } },
    });
  }
}
