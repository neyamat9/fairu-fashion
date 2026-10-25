import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { CartOwner } from '../../common/cart/cart-owner';
import {
  CurrentCartOwner,
  GUEST_TOKEN_HEADER,
  isValidGuestToken,
  readGuestToken,
} from '../../common/cart/cart-owner';
import { CartService } from './cart.service';
import { AddCartDto } from './dto/add-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

// Works for logged-in customers (Bearer token) and guests (x-guest-token).
@ApiTags('Customer - Cart')
@ApiBearerAuth()
@ApiHeader({
  name: GUEST_TOKEN_HEADER,
  required: false,
  description: 'Guest cart id (UUID). Required when not logged in.',
})
@UseGuards(OptionalJwtAuthGuard)
@Controller('customer/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Post('guest-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Get a new guest cart id. Store it and send it as the x-guest-token header.',
  })
  issueGuestToken() {
    return this.cartService.issueGuestToken();
  }

  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Move the guest cart (x-guest-token) into the logged-in customer cart',
  })
  async merge(@CurrentUser() user: User, @Req() req: Request) {
    const token = readGuestToken(req);
    if (!isValidGuestToken(token)) {
      throw new BadRequestException(
        `Send the guest cart id in the "${GUEST_TOKEN_HEADER}" header`,
      );
    }
    return this.cartService.mergeGuestCart(user.id, token.toLowerCase());
  }

  @Get()
  @ApiOperation({ summary: 'Get cart items with totals' })
  async getCart(@CurrentCartOwner() owner: CartOwner) {
    return this.cartService.getCart(owner);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get cart item count' })
  async getCount(@CurrentCartOwner() owner: CartOwner) {
    return this.cartService.getCartCount(owner);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add item to cart (upserts quantity)' })
  async addItem(@CurrentCartOwner() owner: CartOwner, @Body() dto: AddCartDto) {
    return this.cartService.addItem(owner, dto);
  }

  @Patch(':itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateQuantity(
    @CurrentCartOwner() owner: CartOwner,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateQuantity(owner, itemId, dto.quantity);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @CurrentCartOwner() owner: CartOwner,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.cartService.removeItem(owner, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(@CurrentCartOwner() owner: CartOwner) {
    return this.cartService.clearCart(owner);
  }
}
