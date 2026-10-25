import { Prisma } from '@prisma/client';
import { ProductQueryDto, ProductScopeDto } from './dto/product-query.dto';

const ci = 'insensitive' as const;

export interface ParsedSpec {
  name: string;
  values: string[];
}

// "RAM:8GB|12GB" → { name: "RAM", values: ["8GB", "12GB"] }.
// Several params for the same name are merged.
export function parseSpecs(specs: string[] = []): ParsedSpec[] {
  const byName = new Map<string, ParsedSpec>();
  for (const raw of specs) {
    const idx = raw.indexOf(':');
    if (idx <= 0) continue;
    const name = raw.slice(0, idx).trim();
    const values = raw
      .slice(idx + 1)
      .split('|')
      .map((v) => v.trim())
      .filter(Boolean);
    if (!name || !values.length) continue;
    const key = name.toLowerCase();
    const entry = byName.get(key) ?? { name, values: [] };
    entry.values.push(...values);
    byName.set(key, entry);
  }
  return [...byName.values()];
}

// Active products in the requested category / sub-category / search.
export function buildScopeWhere(q: ProductScopeDto): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };
  if (q.category) where.category = { slug: q.category };
  if (q.subCategory) {
    // one slug, or several separated by commas (the storefront's multi-select filter)
    const slugs = q.subCategory
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    where.subCategory = { slug: slugs.length > 1 ? { in: slugs } : slugs[0] };
  }
  const search = q.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: ci } },
      { shortDescription: { contains: search, mode: ci } },
      { brandName: { contains: search, mode: ci } },
      { categoryName: { contains: search, mode: ci } },
      { subCategoryName: { contains: search, mode: ci } },
      { productCode: { equals: search, mode: ci } },
      { tags: { some: { tag: { equals: search, mode: ci } } } },
    ];
  }
  return where;
}

// Matches a product that has the attribute (product-level attribute, or any
// of its variants' attribute1..3) with one of the values.
function specWhere(spec: ParsedSpec): Prisma.ProductWhereInput {
  const valueMatch = spec.values.map((v) => ({
    value: { equals: v, mode: ci },
  }));
  const variantMatch: Prisma.ProductVariantWhereInput[] = [];
  for (const n of [1, 2, 3] as const) {
    for (const v of spec.values) {
      variantMatch.push({
        [`attribute${n}Name`]: { equals: spec.name, mode: ci },
        [`attribute${n}Value`]: { equals: v, mode: ci },
      });
    }
  }
  return {
    OR: [
      {
        attributes: {
          some: { name: { equals: spec.name, mode: ci }, OR: valueMatch },
        },
      },
      { variants: { some: { OR: variantMatch } } },
    ],
  };
}

// Full product-list filter. `regularPriceField` is the Prisma field
// reference used for the "on sale" (sellingPrice < regularPrice) check.
export function buildProductWhere(
  q: ProductQueryDto,
  regularPriceField: Prisma.FieldRef<'Product', 'Decimal'>,
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [buildScopeWhere(q)];

  if (q.brand?.length) and.push({ brand: { slug: { in: q.brand } } });

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    and.push({
      sellingPrice: {
        ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
        ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
      },
    });
  }
  if (q.inStock) and.push({ stock: { gt: 0 } });
  if (q.onSale) and.push({ sellingPrice: { lt: regularPriceField } });
  if (q.rating) and.push({ avgRating: { gte: q.rating } });
  if (q.tag?.length) {
    and.push({
      tags: {
        some: { OR: q.tag.map((t) => ({ tag: { equals: t, mode: ci } })) },
      },
    });
  }
  for (const spec of parseSpecs(q.spec)) and.push(specWhere(spec));

  return { AND: and };
}

export function buildOrderBy(
  sortBy: ProductQueryDto['sortBy'],
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'price-asc':
      return [{ sellingPrice: 'asc' }, { id: 'asc' }];
    case 'price-desc':
      return [{ sellingPrice: 'desc' }, { id: 'asc' }];
    case 'popular':
      return [{ totalSales: 'desc' }, { id: 'asc' }];
    case 'rating':
      return [
        { avgRating: { sort: 'desc', nulls: 'last' } },
        { reviewCount: 'desc' },
        { id: 'asc' },
      ];
    case 'name':
      return [{ name: 'asc' }];
    default:
      return [{ createdAt: 'desc' }, { id: 'asc' }];
  }
}

const SIZE_RE = /^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)$/i;
const UNIT: Record<string, number> = { KB: 1, MB: 1e3, GB: 1e6, TB: 1e9 };

// Sorts facet values for display: storage/memory sizes by size
// ("512GB" < "1TB"), everything else naturally ("8GB" < "12GB", "A2" < "A10").
export function facetValueCompare(a: string, b: string) {
  const ma = SIZE_RE.exec(a);
  const mb = SIZE_RE.exec(b);
  if (ma && mb) {
    return (
      parseFloat(ma[1]) * UNIT[ma[2].toUpperCase()] -
      parseFloat(mb[1]) * UNIT[mb[2].toUpperCase()]
    );
  }
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
}
