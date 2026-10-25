import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsUUID,
  MaxLength,
  IsString,
} from 'class-validator';

export class SubscribeBackInStockDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Required when the product has variants',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({
    description:
      'Required for guests. Logged-in customers use their account email.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

export class CancelBackInStockDto {
  @ApiProperty({
    description: 'The token from the link in the alert / subscription response',
  })
  @IsString()
  @MaxLength(64)
  token: string;
}
