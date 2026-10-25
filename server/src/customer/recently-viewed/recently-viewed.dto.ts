import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TrackViewDto {
  @ApiPropertyOptional({ description: 'Product id (send this or slug)' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Product slug (send this or productId)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;
}

export class ListRecentlyViewedDto {
  @ApiPropertyOptional({ default: 12, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 12;

  @ApiPropertyOptional({
    description: 'Product id to leave out (the product page being viewed)',
  })
  @IsOptional()
  @IsUUID()
  exclude?: string;
}
