import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ example: 'rahim@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ example: 'footer', description: 'Where the form was' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/i, { message: 'source must be a short identifier' })
  source?: string;
}

export class UnsubscribeDto {
  @ApiProperty({ description: 'Token from the unsubscribe link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  token: string;
}
