import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { BrandStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({
    example: 'Apple',
    description: 'The unique name of the brand',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'apple',
    description: 'The unique URL-friendly slug for the brand',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Brand logo URL',
  })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({
    example: 'Premium tech brand',
    description: 'A short description of the brand',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether this brand should be featured on the homepage',
  })
  @IsBoolean()
  @IsOptional()
  isHomepage?: boolean;

  @ApiPropertyOptional({
    enum: BrandStatus,
    default: BrandStatus.ACTIVE,
    description: 'Current status of the brand',
  })
  @IsEnum(BrandStatus)
  @IsOptional()
  status?: BrandStatus;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  banner?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  foundedYear?: number;
}
