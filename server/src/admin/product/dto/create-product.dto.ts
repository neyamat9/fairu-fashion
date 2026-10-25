import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  ArrayMaxSize,
  IsNotEmpty,
  MaxLength,
  Min,
  IsInt,
  IsIn,
  IsDate,
  Matches,
  ValidateIf,
  IsPositive,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

class SpecificationItemDto {
  @ApiProperty({
    example: 'Image Sensor',
    description: 'The key of the specification',
  })
  @IsString()
  key: string;

  @ApiProperty({
    example: '1/3" Progressive Scan CMOS',
    description: 'The value of the specification',
  })
  @IsString()
  value: string;
}

class SpecificationHeaderDto {
  @ApiProperty({
    example: 'General Information',
    description: 'The heading title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    type: [SpecificationItemDto],
    description: 'List of key-value pairs under this header',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificationItemDto)
  items: SpecificationItemDto[];
}

// Filterable attributes shown as storefront filters, e.g.
// { name: "RAM", value: "8GB" }, { name: "Network", value: "5G" }.
export class ProductAttributeDto {
  @ApiProperty({ example: 'RAM' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '8GB' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value: string;
}

// One purchasable option of a product (colour / storage / size...).
export class ProductVariantInputDto {
  @ApiPropertyOptional({
    example: 'Black / 256GB',
    description: 'Shown to customers. Built from the attributes when omitted.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiProperty({
    example: 'A55-BLK-256',
    description: 'Unique across all products',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'sku may only contain letters, numbers, dots, dashes and underscores',
  })
  sku: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  barcode?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Price of this variant. Leave out to use the product price.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number | null;

  @ApiPropertyOptional({ description: 'Starting stock (default 0)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Color' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  attribute1Name?: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attribute1Value?: string;

  @ApiPropertyOptional({ example: 'Storage' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  attribute2Name?: string;

  @ApiPropertyOptional({ example: '256GB' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attribute2Value?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  attribute3Name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attribute3Value?: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateProductDto {
  @ApiProperty({
    example: 'Samsung Galaxy A55 5G',
    description: 'The name of the product',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'samsung-galaxy-a55-5g',
    description:
      'URL slug (lowercase letters, numbers, dashes). Made from the name when omitted.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  @Matches(SLUG_RE, {
    message:
      'slug may only contain lowercase letters, numbers and single dashes',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'PROD-001',
    description: 'Internal product code (unique)',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  productCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  barcode?: string;

  @ApiProperty({ description: 'Full description (HTML or text)' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  shortDescription?: string;

  @ApiPropertyOptional({
    example: '1 year official warranty',
    description: 'Shown on the product page and on invoices',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  warrantyInfo?: string;

  @ApiPropertyOptional({ enum: ProductStatus, default: 'ACTIVE' })
  @IsOptional()
  @IsIn(Object.values(ProductStatus))
  status?: ProductStatus;

  @ApiProperty({ example: 1500, description: 'What you paid (private)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyingPrice: number;

  @ApiProperty({
    example: 2000,
    description: 'MRP / original price (shown struck through)',
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  regularPrice: number;

  @ApiProperty({ example: 1800, description: 'Normal selling price' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  sellingPrice: number;

  @ApiPropertyOptional({
    nullable: true,
    example: 1700,
    description:
      'Promotional price. Applied automatically between discountStart and discountEnd; null removes the discount.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPrice?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Starts immediately when omitted',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Date)
  @IsDate()
  discountStart?: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Runs until removed when omitted',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Date)
  @IsDate()
  discountEnd?: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 'Eid Sale' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(60)
  discountLabel?: string | null;

  @ApiPropertyOptional({
    description:
      'Quantity in stock (products without variants). With variants, set the stock of each variant.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    default: 5,
    description: 'Shown as "low stock" at or below this',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Delivery is free for this product',
  })
  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;

  @ApiPropertyOptional({ description: 'kg' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ description: 'cm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ description: 'cm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: 'cm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isHot?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isBestSeller?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isLimitedStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaKeywords?: string;

  @ApiPropertyOptional({ type: [String], example: ['Charger', 'USB-C cable'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  inTheBox?: string[];

  @ApiPropertyOptional({
    description: 'Derived from `specifications` when omitted',
  })
  @IsBoolean()
  @IsOptional()
  hasSpecification?: boolean;

  @ApiPropertyOptional({ example: 'BRAND_UUID', description: 'Valid Brand ID' })
  @IsUUID()
  @IsOptional()
  brandId?: string;

  @ApiProperty({ example: 'CATEGORY_UUID', description: 'Valid Category ID' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    example: 'SUB_CATEGORY_UUID',
    description: 'Optional Sub-Category ID (must belong to the category)',
  })
  @IsOptional()
  @IsUUID()
  subCategoryId?: string;

  @ApiPropertyOptional({
    type: [SpecificationHeaderDto],
    description: 'Dynamic specifications grouped by header',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecificationHeaderDto)
  specifications?: SpecificationHeaderDto[];

  @ApiPropertyOptional({
    type: [ProductAttributeDto],
    description:
      'Filterable attributes (RAM, Storage, Color, Network...). On update, the list replaces all existing attributes.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @ApiPropertyOptional({
    type: [String],
    example: ['5G', 'gaming'],
    description: 'Search tags. On update, the list replaces all existing tags.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: [ProductVariantInputDto],
    description:
      'Create the product with its variants. On an existing product use the /variants endpoints.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}
