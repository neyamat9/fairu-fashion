import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsBdMobile } from '../../common/utils/phone';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ContactDto {
  @ApiProperty({ example: 'Rahim Uddin' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'rahim@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ example: '01712345678' })
  @IsOptional()
  @IsBdMobile()
  phone?: string;

  @ApiProperty({ example: 'Warranty question' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject: string;

  @ApiProperty({ example: 'My earbuds stopped charging after 2 weeks...' })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  // Honeypot: hidden in the form. Real visitors leave it empty; bots fill it.
  @ApiPropertyOptional({ description: 'Leave empty (spam trap)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
