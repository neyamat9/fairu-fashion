import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsBdMobile } from '../../../common/utils/phone';

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @IsBdMobile()
  phone: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: 'City / district. Defaults to the district when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'dhaka', description: 'Division id or name' })
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
    description: 'Upazila or city thana (optional)',
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
}

export class PlaceOrderDto {
  // Cash on Delivery or manual mobile banking (bKash / Nagad / Rocket) — no payment gateway.
  @ApiProperty({ enum: ['CASH_ON_DELIVERY', 'BKASH', 'NAGAD', 'ROCKET'] })
  @IsEnum(['CASH_ON_DELIVERY', 'BKASH', 'NAGAD', 'ROCKET'])
  paymentMethod: 'CASH_ON_DELIVERY' | 'BKASH' | 'NAGAD' | 'ROCKET';

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({
    enum: ['INSIDE_DHAKA', 'OUTSIDE_DHAKA'],
    description:
      'Shipping zone picked at checkout. Ignored when shipping mode is GLOBAL. If omitted, inferred from shippingAddress.city.',
  })
  @IsOptional()
  @IsIn(['INSIDE_DHAKA', 'OUTSIDE_DHAKA'])
  shippingZone?: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';

  // Required for bKash / Nagad / Rocket: the transaction ID the customer received
  // after manually sending the payment. An admin verifies it against the
  // merchant account before marking the order PAID. (The field keeps its old
  // "bkash" name but is used for every mobile-banking method.)
  @ApiPropertyOptional({
    description:
      'Transaction ID of the mobile-banking payment (bKash / Nagad / Rocket).',
  })
  @ValidateIf((dto: PlaceOrderDto) => dto.paymentMethod !== 'CASH_ON_DELIVERY')
  @IsString()
  @IsNotEmpty({ message: 'The transaction ID is required for mobile banking' })
  @Matches(/^[A-Za-z0-9]{6,20}$/, {
    message: 'The transaction ID must be 6-20 letters or digits',
  })
  bkashTransactionId?: string;

  // The mobile-banking number the customer sent the payment from, so the
  // admin can match it against the merchant statement.
  @ApiPropertyOptional({
    description: 'The mobile-banking number the payment was sent from.',
  })
  @ValidateIf((dto: PlaceOrderDto) => dto.paymentMethod !== 'CASH_ON_DELIVERY')
  @IsString()
  @IsNotEmpty({ message: 'The sender number is required for mobile banking' })
  bkashSenderNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryNote?: string;

  @ApiPropertyOptional({
    description:
      'Guest checkout only: email for the order confirmation (ignored when logged in)',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
