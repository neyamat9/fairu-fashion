import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ProductStatus } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { ProductVariantInputDto } from './create-product.dto';

export const STOCK_STATES = ['in', 'low', 'out'] as const;
export const ADMIN_PRODUCT_SORTS = [
  'newest',
  'oldest',
  'name',
  'price-asc',
  'price-desc',
  'stock-asc',
  'stock-desc',
  'sold',
] as const;

export class AdminProductQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Name, code, brand, slug or a variant SKU',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsIn(Object.values(ProductStatus))
  status?: ProductStatus;

  @ApiPropertyOptional({
    enum: ['hidden'],
    description: 'hidden = draft + inactive (not shown on the shop)',
  })
  @IsOptional()
  @IsIn(['hidden'])
  visibility?: 'hidden';

  @ApiPropertyOptional({
    description: 'true = live products that are on a promo price right now',
  })
  @IsOptional()
  @IsIn(['true'])
  onDiscount?: 'true';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({
    enum: STOCK_STATES,
    description: 'in = above the low-stock level, low, out = 0',
  })
  @IsOptional()
  @IsIn(STOCK_STATES)
  stock?: (typeof STOCK_STATES)[number];

  @ApiPropertyOptional({ enum: ADMIN_PRODUCT_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(ADMIN_PRODUCT_SORTS)
  sortBy?: (typeof ADMIN_PRODUCT_SORTS)[number];
}

export class SetTagsDto {
  @ApiProperty({ type: [String], example: ['5G', 'gaming'] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags: string[];
}

export class UpdateVariantDto extends PartialType(ProductVariantInputDto) {}

export class UpdateImageDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  alt?: string | null;

  @ApiPropertyOptional({ description: 'true makes it the main image' })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class ReorderImagesDto {
  @ApiProperty({
    type: [String],
    description: 'ALL image ids of the product, in the wanted order',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageIds: string[];
}

export class AttachImagesDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Ids of files from the media library',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  uploadIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Images hosted elsewhere (https)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  @MaxLength(500, { each: true })
  urls?: string[];
}

export class ImageUploadQueryDto {
  @ApiPropertyOptional({ description: 'Alt text for the uploaded images' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  alt?: string;
}
