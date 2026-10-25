import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { CartOwner } from '../../common/cart/cart-owner';
import {
  CurrentCartOwner,
  GUEST_TOKEN_HEADER,
} from '../../common/cart/cart-owner';
import { RecentlyViewedService } from './recently-viewed.service';
import { ListRecentlyViewedDto, TrackViewDto } from './recently-viewed.dto';

// Works for logged-in customers (Bearer token) and guests (x-guest-token).
@ApiTags('Customer - Recently Viewed')
@ApiBearerAuth()
@ApiHeader({
  name: GUEST_TOKEN_HEADER,
  required: false,
  description: 'Guest id (UUID). Required when not logged in.',
})
@UseGuards(OptionalJwtAuthGuard)
@Controller('customer/recently-viewed')
export class RecentlyViewedController {
  constructor(private readonly service: RecentlyViewedService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 120 } })
  @ApiOperation({
    summary:
      'Record that the customer looked at a product (call from the product page). Re-viewing moves it to the top.',
  })
  track(@CurrentCartOwner() owner: CartOwner, @Body() dto: TrackViewDto) {
    return this.service.track(owner, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Recently viewed products, newest first (product cards)',
  })
  list(
    @CurrentCartOwner() owner: CartOwner,
    @Query() q: ListRecentlyViewedDto,
  ) {
    return this.service.list(owner, q.limit, q.exclude);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the recently viewed list' })
  clear(@CurrentCartOwner() owner: CartOwner) {
    return this.service.clear(owner);
  }
}
