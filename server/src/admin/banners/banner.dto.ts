import { ApiPropertyOptional } from '@nestjs/swagger';
import { BannerLinkType, BannerPosition } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
// '' from a form means "clear this field"
const toDate = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? value === undefined
      ? undefined
      : null
    : new Date(value as string);
const blankToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export class CreateBannerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(150)
  title?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  subtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ description: 'Required when creating' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  mobileImageUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  linkUrl?: string | null;

  @ApiPropertyOptional({ enum: BannerLinkType })
  @IsOptional()
  @IsEnum(BannerLinkType)
  linkType?: BannerLinkType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  linkResourceId?: string | null;

  @ApiPropertyOptional({ enum: BannerPosition })
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(toDate)
  @ValidateIf((_, v) => v !== null)
  @IsDate()
  startDate?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(toDate)
  @ValidateIf((_, v) => v !== null)
  @IsDate()
  endDate?: Date | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(30)
  bgColor?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(30)
  textColor?: string | null;
}

export class UpdateBannerDto {
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(150)
  title?: string | null;
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  subtitle?: string | null;
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  description?: string | null;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  imageUrl?: string;
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  mobileImageUrl?: string | null;
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  linkUrl?: string | null;
  @IsOptional() @IsEnum(BannerLinkType) linkType?: BannerLinkType;
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  linkResourceId?: string | null;
  @IsOptional() @IsEnum(BannerPosition) position?: BannerPosition;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional()
  @Transform(toDate)
  @ValidateIf((_, v) => v !== null)
  @IsDate()
  startDate?: Date | null;
  @IsOptional()
  @Transform(toDate)
  @ValidateIf((_, v) => v !== null)
  @IsDate()
  endDate?: Date | null;
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(30)
  bgColor?: string | null;
  @IsOptional()
  @Transform(blankToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(30)
  textColor?: string | null;
}
