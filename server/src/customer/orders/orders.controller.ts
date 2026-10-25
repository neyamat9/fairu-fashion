import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoiceService } from '../../common/invoice';
import { normalizeBdPhone } from '../../common/utils/phone';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { CartOwner } from '../../common/cart/cart-owner';
import {
  CurrentCartOwner,
  GUEST_TOKEN_HEADER,
} from '../../common/cart/cart-owner';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ClaimOrdersDto } from './dto/claim-orders.dto';
import type { User } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/place-order.dto';

@ApiTags('Customer - Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all orders for current user' })
  async findAll(@CurrentUser() user: User) {
    return this.ordersService.findAll(user.id);
  }

  // Declared before ':id' so "track" is not captured as an order ID.
  @Public()
  @Get('track')
  @Throttle({ medium: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: 'Public order tracking by order number + phone (no login needed)',
  })
  @ApiQuery({ name: 'orderNumber', example: 'RZ-20260512-0001' })
  @ApiQuery({ name: 'phone', example: '01712345678' })
  async track(
    @Query('orderNumber') orderNumber: string,
    @Query('phone') phone: string,
  ) {
    if (!orderNumber?.trim() || !phone?.trim()) {
      throw new BadRequestException('orderNumber and phone are required');
    }
    return this.ordersService.trackOrder(orderNumber, phone);
  }

  // Guest invoice: same order number + phone check as tracking.
  @Public()
  @Get('invoice')
  @Throttle({ medium: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary:
      'Invoice by order number + phone (guests). format=html (default, printable) or json',
  })
  @ApiQuery({ name: 'orderNumber', example: 'RZ-20260512-0001' })
  @ApiQuery({ name: 'phone', example: '01712345678' })
  @ApiQuery({ name: 'format', required: false, enum: ['html', 'json'] })
  async guestInvoice(
    @Query('orderNumber') orderNumber: string,
    @Query('phone') phone: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!orderNumber?.trim() || !phone?.trim()) {
      throw new BadRequestException('orderNumber and phone are required');
    }
    const normalized = normalizeBdPhone(phone);
    return this.invoiceService.respond(
      res,
      {
        orderNumber: orderNumber.trim().toUpperCase(),
        OR: [
          { guestPhone: normalized },
          { shippingAddress: { phone: normalized } },
          { user: { phone: normalized } },
        ],
      },
      format,
    );
  }

  @Get(':id/invoice')
  @ApiOperation({
    summary:
      'Invoice for my order (for warranty claims). format=html (default, printable) or json',
  })
  @ApiQuery({ name: 'format', required: false, enum: ['html', 'json'] })
  async invoice(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.invoiceService.respond(res, { id, userId: user.id }, format);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  async findById(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ordersService.findById(user.id, id);
  }

  // Public so guests can order; OptionalJwtAuthGuard still attaches the
  // customer when a Bearer token is sent.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ medium: { ttl: 60000, limit: 30 } })
  @ApiHeader({
    name: GUEST_TOKEN_HEADER,
    required: false,
    description: 'Guest cart id (UUID). Required for guest checkout.',
  })
  @ApiOperation({
    summary:
      'Place order from the cart — logged-in customers or guests (x-guest-token)',
  })
  async placeOrder(
    @CurrentCartOwner() owner: CartOwner,
    @Body() dto: PlaceOrderDto,
  ) {
    return this.ordersService.placeOrder(owner, dto);
  }

  @Post(':id/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Buy again: put the items of this order into my cart (current prices and stock; unavailable items are reported)',
  })
  async reorder(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.reorder(user.id, id);
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary:
      'Add orders you placed as a guest to your account. Send each order number with the phone it was placed with (up to 10).',
  })
  claim(@CurrentUser() user: User, @Body() dto: ClaimOrdersDto) {
    return this.ordersService.claimOrders(user, dto.orders);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an order (only PENDING/CONFIRMED/PROCESSING)',
  })
  async cancelOrder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user.id, id);
  }
}
