import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsBdMobile } from '../../../common/utils/phone';

export class CreateAddressDto {
  @ApiPropertyOptional({ default: 'Home' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: '01712345678' })
  @IsBdMobile()
  phone: string;

  @ApiPropertyOptional({ example: '01812345678' })
  @IsOptional()
  @IsBdMobile()
  alternatePhone?: string;

  @ApiProperty()
  @IsString()
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiPropertyOptional({
    description: 'City / district. Defaults to the district when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: 'dhaka',
    description: 'Division id or name (see /customer/locations)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  division?: string;

  @ApiPropertyOptional({ example: 'dhaka', description: 'District id or name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({
    example: 'savar',
    description:
      'Upazila or city thana (optional) — must belong to the district',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  upazila?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
