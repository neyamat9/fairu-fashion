import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProductsService } from './products.service';
import {
  ProductQueryDto,
  ProductScopeDto,
  SectionQueryDto,
  SuggestionQueryDto,
} from './dto/product-query.dto';

// Clamp a numeric query param ("abc" / negative / huge → fallback / bounds).
function clampInt(raw: string | undefined, fallback: number, max: number) {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

@ApiTags('Customer - Products')
@Controller('customer/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List products: filter by category, brand(s), price, stock, on sale, rating, tag and spec (spec=RAM:8GB|12GB&spec=Network:5G)',
  })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  // Static routes are declared before ':slug' so they are not read as slugs.

  @Get('filters')
  @ApiOperation({
    summary:
      'Filter facets for a category/sub-category/search: brands, price range, spec values (RAM, Storage, Color...), ratings, tags, availability — with counts',
  })
  async filters(@Query() scope: ProductScopeDto) {
    return this.productsService.getFilters(scope);
  }

  @Get('suggestions')
  @Throttle({ short: { ttl: 10000, limit: 30 } })
  @ApiOperation({
    summary:
      'Search autocomplete: top products (prefix matches first), categories, sub-categories and brands',
  })
  async suggestions(@Query() q: SuggestionQueryDto) {
    return this.productsService.suggestions(q.q, q.limit);
  }

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Newest products (paginated)' })
  async newArrivals(@Query() q: SectionQueryDto) {
    return this.productsService.newArrivals(q);
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Best-selling products (paginated)' })
  async bestSellers(@Query() q: SectionQueryDto) {
    return this.productsService.bestSellers(q);
  }

  @Get('on-sale')
  @ApiOperation({
    summary: 'Discounted products, biggest discount first (paginated)',
  })
  async onSale(@Query() q: SectionQueryDto) {
    return this.productsService.onSale(q);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  async getFeatured(@Query('limit') limit?: string) {
    return this.productsService.getFeatured(clampInt(limit, 8, 50));
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products (simple list; see /suggestions)' })
  async search(@Query('q') q?: string) {
    const term = q?.trim().slice(0, 100);
    if (!term) return [];
    return this.productsService.searchSuggestions(term);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product by slug' })
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    await this.productsService.incrementView(slug).catch(() => {});
    return product;
  }

  @Get(':slug/related')
  @ApiOperation({ summary: 'Get related products' })
  async getRelated(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
  ) {
    const product = await this.productsService.findBySlug(slug);
    return this.productsService.getRelated(
      product.id,
      product.categoryId,
      clampInt(limit, 6, 24),
    );
  }
}
