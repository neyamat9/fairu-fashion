import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { toBool } from '../../../common/utils/transforms';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ADJUST_MODES = ['ADD', 'REMOVE', 'SET'] as const;
// Reasons an admin can pick (SALE and RETURN are written by orders/returns).
export const ADJUST_REASONS = [
  'RESTOCK',
  'ADJUSTMENT',
  'DAMAGED',
  'TRANSFER',
] as const;
export const LOG_REASONS = [
  'RESTOCK',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'DAMAGED',
  'TRANSFER',
] as const;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

class Paged {
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

export class AdjustStockDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Required when the product has variants',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({
    enum: ADJUST_MODES,
    description:
      'ADD = receive stock, REMOVE = take stock out, SET = stock count (exact number)',
  })
  @IsIn(ADJUST_MODES)
  mode: (typeof ADJUST_MODES)[number];

  @ApiProperty({
    example: 10,
    description: 'Units to add / remove, or the exact stock for SET',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  quantity: number;

  @ApiProperty({ enum: ADJUST_REASONS })
  @IsIn(ADJUST_REASONS)
  reason: (typeof ADJUST_REASONS)[number];

  @ApiPropertyOptional({ example: 'Supplier invoice #4521' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  note?: string;
}

export class InventoryListDto extends Paged {
  @ApiPropertyOptional({ description: 'Product name, product code or SKU' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['all', 'low', 'out'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'low', 'out'])
  state?: 'all' | 'low' | 'out';
}

export class StockLogQueryDto extends Paged {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ enum: LOG_REASONS })
  @IsOptional()
  @IsIn(LOG_REASONS)
  reason?: (typeof LOG_REASONS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class BulkStockQueryDto {
  @ApiPropertyOptional({
    enum: ['set', 'add'],
    default: 'set',
    description:
      'set = the file holds the new stock; add = the file holds units received',
  })
  @IsOptional()
  @IsIn(['set', 'add'])
  mode: 'set' | 'add' = 'set';

  @ApiPropertyOptional({
    description:
      'true = check the file and report problems without changing anything',
  })
  @IsOptional()
  @Transform(toBool)
  dryRun: boolean = false;
}
