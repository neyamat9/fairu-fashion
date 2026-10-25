import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toBool } from '../../../common/utils/transforms';

// "a,b" or ["a","b"] → ["a","b"]
const toList = ({ value }: { value: unknown }) => {
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
};

// spec=RAM:8GB  /  spec=RAM:8GB|12GB  /  repeated spec params
const toArray = ({ value }: { value: unknown }) =>
  (Array.isArray(value) ? value : [value])
    .map((v) => String(v).trim())
    .filter(Boolean);

export const PRODUCT_SORTS = [
  'newest',
  'price-asc',
  'price-desc',
  'popular',
  'rating',
  'name',
] as const;

// Where the products are looked for. Shared by the product list and the
// filter facets endpoint.
export class ProductScopeDto {
  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  category?: string;

  @ApiPropertyOptional({ description: 'Sub-category slug' })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  subCategory?: string;

  @ApiPropertyOptional({ description: 'Free-text search' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ProductQueryDto extends ProductScopeDto {
  @ApiPropertyOptional({
    description: 'Brand slug(s), comma-separated: brand=samsung,xiaomi',
  })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  brand?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Only products in stock' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({
    description: 'Only discounted products (selling price below regular price)',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum average rating, 1–5 (e.g. 4 = "4★ & up")',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Product tag(s), comma-separated: tag=5G,gaming',
  })
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tag?: string[];

  @ApiPropertyOptional({
    description:
      'Attribute filters as Name:Value. Values of one attribute are OR-ed with "|", different attributes are AND-ed. Repeat the param: spec=RAM:8GB|12GB&spec=Storage:256GB&spec=Network:5G',
    type: [String],
  })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  @Matches(/^[^:]+:.+$/, {
    each: true,
    message: 'spec must look like Name:Value (e.g. RAM:8GB)',
  })
  spec?: string[];

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sortBy?: (typeof PRODUCT_SORTS)[number];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SuggestionQueryDto {
  @ApiPropertyOptional({ description: 'What the customer has typed so far' })
  @IsString()
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({ default: 6, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 6;
}

export class SectionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'Limit to a category slug' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  category?: string;
}
