import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CouponType, DiscountType } from '@prisma/client';
import { parseIdList } from '../../../customer/coupons/coupons.service';

// Accepts an array of IDs, a JSON array string, or a comma-separated string.
// Anything else is passed through so @IsArray reports it.
const toIdArray = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') return parseIdList(value);
  return value;
};

export class CreateCouponDto {
  @ApiProperty({ example: 'EID500' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code may only contain letters, numbers, - and _',
  })
  code: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ enum: CouponType, default: 'PUBLIC' })
  @IsOptional()
  @IsEnum(CouponType)
  type?: CouponType;

  @ApiPropertyOptional({
    enum: [
      DiscountType.PERCENTAGE,
      DiscountType.FIXED_AMOUNT,
      DiscountType.FREE_SHIPPING,
    ],
    default: 'PERCENTAGE',
  })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiProperty({
    description:
      'Percent (10 = 10%) or fixed amount in BDT. Use 0 for FREE_SHIPPING.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Cap for percentage discounts',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscount?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Total uses allowed (null = unlimited)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsageCount?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Uses per customer (null = unlimited)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsagePerUser?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty() @Type(() => Date) @IsDate() validFrom: Date;
  @ApiProperty() @Type(() => Date) @IsDate() validTo: Date;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  appliesToAllProducts?: boolean;

  @ApiPropertyOptional({
    type: [String],
    nullable: true,
    description: 'Category IDs',
  })
  @IsOptional()
  @Transform(toIdArray)
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[] | null;

  @ApiPropertyOptional({
    type: [String],
    nullable: true,
    description: 'Product IDs',
  })
  @IsOptional()
  @Transform(toIdArray)
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @IsString({ each: true })
  applicableProducts?: string[] | null;

  @ApiPropertyOptional({
    type: [String],
    nullable: true,
    description: 'User IDs (for PRIVATE coupons)',
  })
  @IsOptional()
  @Transform(toIdArray)
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @IsString({ each: true })
  applicableUsers?: string[] | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export const COUPON_STATES = [
  'active',
  'scheduled',
  'expired',
  'inactive',
  'used-up',
] as const;

export class ListCouponsDto {
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

  @ApiPropertyOptional({ description: 'Part of the code or description' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  search?: string;

  @ApiPropertyOptional({ enum: COUPON_STATES })
  @IsOptional()
  @IsIn(COUPON_STATES)
  state?: (typeof COUPON_STATES)[number];
}

export class UsageQueryDto {
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
}

export class UsageExportDto {
  @ApiPropertyOptional({ enum: ['csv', 'xlsx'], default: 'csv' })
  @IsOptional()
  @IsIn(['csv', 'xlsx'])
  format: 'csv' | 'xlsx' = 'csv';
}

// A batch of unique codes that share the same rules (e.g. 200 single-use
// 500 BDT vouchers for a giveaway).
export class BulkGenerateCouponsDto extends OmitType(CreateCouponDto, [
  'code',
  'applicableUsers',
  'maxUsageCount',
  'maxUsagePerUser',
] as const) {
  @ApiProperty({ minimum: 1, maximum: 1000, example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  count: number;

  @ApiPropertyOptional({
    example: 'EID',
    description: 'Start of every code: EID-K7M2Q9XP',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9]{1,12}$/, {
    message: 'prefix may only contain letters and numbers (max 12)',
  })
  prefix?: string;

  @ApiPropertyOptional({
    default: 8,
    minimum: 6,
    maximum: 16,
    description: 'Length of the random part',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(6)
  @Max(16)
  codeLength: number = 8;

  @ApiPropertyOptional({
    default: 1,
    description: 'Total uses of EACH code (default: single use)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsageCount: number = 1;

  @ApiPropertyOptional({
    default: 1,
    description: 'Uses per customer of EACH code',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsagePerUser: number = 1;

  @ApiPropertyOptional({
    enum: ['json', 'csv', 'xlsx'],
    default: 'json',
    description: 'csv / xlsx download the codes',
  })
  @IsOptional()
  @IsIn(['json', 'csv', 'xlsx'])
  format: 'json' | 'csv' | 'xlsx' = 'json';
}
