import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toBool } from '../../common/utils/transforms';

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

export class WaitingListDto extends Paged {
  @ApiPropertyOptional({ description: 'Product name or SKU' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'true = only items that have stock again (ready to alert)',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  inStockNow?: boolean;
}

export class RequestsListDto extends Paged {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'true = already alerted, false = still waiting',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  notified?: boolean;

  @ApiPropertyOptional({ description: 'Customer email (part of it)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;
}

export class NotifyNowDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Required for products with variants' })
  @IsOptional()
  @IsUUID()
  variantId?: string;
}
