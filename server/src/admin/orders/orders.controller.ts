import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { InvoiceService } from '../../common/invoice';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminOrdersService } from './orders.service';
import { OrderEditService } from './order-edit.service';
import { OrderPaymentsService } from './order-payments.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import {
  BulkOrderStatusDto,
  CreateOrderDto,
  ExportOrdersQueryDto,
  ListOrdersDto,
  OrderFilterDto,
  ShippingQuoteQueryDto,
  RecordPaymentDto,
  RecordRefundDto,
  UpdateOrderAddressDto,
  UpdateOrderItemsDto,
  UpdateOrderNotesDto,
  UpdateOrderStatusDto,
  UpdateShippingInfoDto,
} from './dto/order-admin.dto';

@ApiTags('Admin - Orders')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly orders: AdminOrdersService,
    private readonly edit: OrderEditService,
    private readonly payments: OrderPaymentsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List orders. Filters: status, paymentStatus, paymentMethod, source (WEB/ADMIN), from/to, search (number, name, phone, email, tracking, txn id, or a product name / SKU in the order). Sort: newest, oldest, total-desc, total-asc.',
  })
  findAll(@Query() q: ListOrdersDto) {
    return this.orders.findAll(q);
  }

  @Get('stats')
  @ApiOperation({
    summary:
      'Numbers for the cards above the list (counts per stage, payments to verify, revenue). Same filters as the list except status.',
  })
  stats(@Query() q: OrderFilterDto) {
    return this.orders.stats(q);
  }

  @Get('export')
  @ApiOperation({
    summary:
      'Download the filtered orders as CSV (same filters as the list, up to 20,000 orders)',
  })
  async export(@Query() q: ExportOrdersQueryDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    await this.orders.exportCsv(q, (chunk) => res.write(chunk));
    res.end();
  }

  @Get('shipping-quote')
  @ApiOperation({
    summary:
      'Delivery charge for a subtotal and district, from the shipping settings (used while building a phone/POS order)',
  })
  shippingQuote(@Query() q: ShippingQuoteQueryDto) {
    return this.edit.quoteShipping(
      q.subtotal,
      q.district,
      q.productIds ? q.productIds.split(',').filter(Boolean) : [],
    );
  }

  @Post()
  @ApiOperation({
    summary:
      'Create an order for a customer who ordered by phone/message: pick products, address, payment; optional coupon, manual discount/shipping, amount already paid',
  })
  create(@Body() dto: CreateOrderDto, @CurrentUser() admin: User) {
    return this.edit.create(dto, admin.id);
  }

  @Patch('bulk-status')
  @ApiOperation({
    summary:
      'Change the status of up to 100 orders at once. Each order is checked on its own; the answer lists what failed.',
  })
  bulkStatus(@Body() dto: BulkOrderStatusDto, @CurrentUser() admin: User) {
    return this.orders.bulkStatus(dto.ids, dto.status, dto.note, admin.id);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Order detail: items, address, timeline, payments, refunds, returns',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(id);
  }

  @Get(':id/invoice')
  @ApiOperation({
    summary: 'Order invoice. format=html (default, printable) or json',
  })
  @ApiQuery({ name: 'format', required: false, enum: ['html', 'json'] })
  invoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.invoiceService.respond(res, { id }, format);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Update order status (cancelling puts stock and the coupon back; delivering a COD order marks it paid)',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() admin: User,
  ) {
    return this.orders.updateStatus(id, dto.status, dto.note, admin.id);
  }

  @Patch(':id/shipping')
  @ApiOperation({ summary: 'Courier name, tracking number and tracking link' })
  shippingInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShippingInfoDto,
  ) {
    return this.orders.updateShippingInfo(id, dto);
  }

  @Patch(':id/notes')
  @ApiOperation({
    summary:
      'Internal notes (never shown to the customer) and the delivery note',
  })
  notes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderNotesDto,
  ) {
    return this.orders.updateNotes(id, dto);
  }

  @Put(':id/address')
  @ApiOperation({
    summary:
      'Change the delivery address (before the order is handed to the courier). recalculateShipping updates the shipping cost.',
  })
  address(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderAddressDto,
    @CurrentUser() admin: User,
  ) {
    return this.edit.updateAddress(id, dto, admin.id);
  }

  @Put(':id/items')
  @ApiOperation({
    summary:
      'Change the products of an order (add, remove, quantity, price). Stock and totals follow. Send the complete list of lines.',
  })
  items(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderItemsDto,
    @CurrentUser() admin: User,
  ) {
    return this.edit.updateItems(id, dto, admin.id);
  }

  @Patch(':id/verify-payment')
  @ApiOperation({
    summary:
      'Verify or reject a manually submitted bKash payment (COD orders are not verified here — they are settled on delivery)',
  })
  verifyPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() admin: User,
  ) {
    return this.orders.verifyPayment(id, dto.paymentStatus, dto.note, admin.id);
  }

  @Get(':id/payments')
  @ApiOperation({
    summary:
      'Payments and refunds of an order, with received / refunded / due totals',
  })
  listPayments(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.list(id);
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record money received (cash at the shop, bKash, deposit)',
  })
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() admin: User,
  ) {
    return this.payments.record(id, dto, admin.id);
  }

  @Post(':id/refunds')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a refund given to the customer (full or partial)',
  })
  recordRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordRefundDto,
    @CurrentUser() admin: User,
  ) {
    return this.payments.refund(id, dto, admin.id);
  }
}
