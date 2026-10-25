import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsBdMobile } from '../../../common/utils/phone';

export class CheckoutSummaryDto {
  @ApiPropertyOptional({ description: 'Coupon code to apply' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @ApiPropertyOptional({
    enum: ['INSIDE_DHAKA', 'OUTSIDE_DHAKA'],
    description:
      'Shipping zone picked by the customer. Ignored when shipping mode is GLOBAL. If omitted, it is inferred from city.',
  })
  @IsOptional()
  @IsIn(['INSIDE_DHAKA', 'OUTSIDE_DHAKA'])
  shippingZone?: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';

  @ApiPropertyOptional({
    description:
      'Delivery district (id or name). Takes priority over city when inferring the zone.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ description: 'Delivery city, used to infer the zone' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description:
      'Guest checkout: the customer phone, used for per-customer coupon rules',
  })
  @IsOptional()
  @IsBdMobile()
  phone?: string;
}
