import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { CategoryStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Electronics',
    description: 'The unique name of the category',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'electronics',
    description: 'The unique URL-friendly slug for the category',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({
    example: 'https://example.com/category-image.png',
    description: 'Category representative image URL',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    example: 'All kinds of electronic items',
    description: 'A short description of the category',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether this category should be displayed on the homepage',
  })
  @IsBoolean()
  @IsOptional()
  isHomepage?: boolean;

  @ApiPropertyOptional({
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
    description: 'Current status of the category',
  })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  metaDescription?: string;
}
