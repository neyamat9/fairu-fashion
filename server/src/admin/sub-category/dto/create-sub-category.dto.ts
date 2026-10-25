import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { SubCategoryStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubCategoryDto {
  @ApiProperty({
    example: 'Smartphones',
    description: 'The unique name of the sub-category',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'smartphones',
    description: 'The unique URL-friendly slug for the sub-category',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    example: 'uuid-of-parent-category',
    description: 'The ID of the parent category',
  })
  @IsUUID()
  @IsNotEmpty()
  parentCategoryId: string;

  @ApiPropertyOptional({
    example: 'https://example.com/subcategory-image.png',
    description: 'Sub-category image URL',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({
    example: 'Latest mobile phones',
    description: 'A short description of the sub-category',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether this sub-category should be featured on the homepage',
  })
  @IsBoolean()
  @IsOptional()
  isHomepage?: boolean;

  @ApiPropertyOptional({
    enum: SubCategoryStatus,
    default: SubCategoryStatus.ACTIVE,
    description: 'Current status of the sub-category',
  })
  @IsEnum(SubCategoryStatus)
  @IsOptional()
  status?: SubCategoryStatus;
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;
}
