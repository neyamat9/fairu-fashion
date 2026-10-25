import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { WishlistService } from './wishlist.service';

@ApiTags('Customer - Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wishlist items' })
  async findAll(@CurrentUser() user: User) {
    return this.wishlistService.findAll(user.id);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  async check(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.isInWishlist(user.id, productId);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add product to wishlist' })
  async add(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async remove(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.remove(user.id, productId);
  }
}
