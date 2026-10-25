import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { CartOwner } from '../../common/cart/cart-owner';
import {
  CurrentCartOwner,
  GUEST_TOKEN_HEADER,
} from '../../common/cart/cart-owner';
import { CheckoutService } from './checkout.service';
import { CheckoutSummaryDto } from './dto/checkout-summary.dto';

@ApiTags('Customer - Checkout')
@ApiBearerAuth()
@ApiHeader({
  name: GUEST_TOKEN_HEADER,
  required: false,
  description: 'Guest cart id (UUID). Required when not logged in.',
})
@UseGuards(OptionalJwtAuthGuard)
@Controller('customer')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('checkout/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Checkout summary: items, stock issues, subtotal, shipping, coupon discount, total, payment methods',
  })
  async summary(
    @CurrentCartOwner() owner: CartOwner,
    @Body() dto: CheckoutSummaryDto,
  ) {
    const quote = await this.checkoutService.quote(owner, dto);
    return this.checkoutService.toResponse(quote);
  }

  @Post('coupons/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Validate a coupon against the cart. Returns the updated summary, or 400 with the reason.',
  })
  async applyCoupon(
    @CurrentCartOwner() owner: CartOwner,
    @Body() dto: CheckoutSummaryDto,
  ) {
    return this.checkoutService.applyCoupon(owner, dto);
  }
}
