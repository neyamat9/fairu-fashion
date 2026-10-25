import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { IsBdMobile } from '../../../common/utils/phone';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
export const ORDER_STATUSES = Object.values(OrderStatus) as OrderStatus[];
export const ORDER_SORTS = [
  'newest',
  'oldest',
  'total-desc',
  'total-asc',
] as const;

export const ORDER_STAGES = [
  'pending',
  'toShip',
  'inDelivery',
  'delivered',
  'onHold',
  'ended',
] as const;

export class OrderFilterDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @ApiPropertyOptional({
    enum: ORDER_STAGES,
    description:
      'A group of statuses (the dashboard cards): pending · toShip (confirmed, processing) · inDelivery (shipped, in transit, out for delivery) · delivered · onHold · ended (cancelled, returned, refunded)',
  })
  @IsOptional()
  @IsIn(ORDER_STAGES)
  stage?: (typeof ORDER_STAGES)[number];

  @ApiPropertyOptional({
    description:
      'true = only bKash/Nagad/Rocket orders whose payment is still to be verified',
  })
  @IsOptional()
  @IsIn(['true'])
  toVerify?: 'true';

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsIn(Object.values(PaymentStatus))
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsIn(Object.values(PaymentMethod))
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    enum: ['WEB', 'ADMIN'],
    description: 'ADMIN = phone orders created by the shop',
  })
  @IsOptional()
  @IsIn(['WEB', 'ADMIN'])
  source?: 'WEB' | 'ADMIN';

  @ApiPropertyOptional({ description: 'Orders placed on or after this time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Orders placed on or before this time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({
    description:
      'Order number, customer name/email/phone, tracking number or transaction id',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class ListOrdersDto extends OrderFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: ORDER_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(ORDER_SORTS)
  sortBy?: (typeof ORDER_SORTS)[number];
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Shown to the customer in the order timeline',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BulkOrderStatusDto {
  @ApiProperty({ type: [String], description: 'Up to 100 order ids' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids: string[];

  @ApiProperty({ enum: OrderStatus })
  @IsIn(ORDER_STATUSES)
  status: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateShippingInfoDto {
  @ApiPropertyOptional({ nullable: true, example: 'Pathao' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  courierName?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'PT-889231' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  trackingNumber?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://pathao.com/track/PT-889231',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  trackingUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Tell the customer (in-app) that tracking details were added',
  })
  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}

export class UpdateOrderNotesDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Private note, never shown to the customer',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  internalNote?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Note for the team (never shown to the customer)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  staffNote?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Delivery instruction shown to the courier / customer',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  deliveryNote?: string | null;
}

export class OrderAddressDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @IsBdMobile()
  phone: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  division?: string;

  @ApiPropertyOptional({ example: 'dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ example: 'savar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  upazila?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

export class UpdateOrderAddressDto extends OrderAddressDto {
  @ApiPropertyOptional({
    default: false,
    description:
      'Work out the shipping cost again for the new area (inside/outside Dhaka) and update the order total',
  })
  @IsOptional()
  @IsBoolean()
  recalculateShipping?: boolean;
}

export class OrderLineDto {
  @ApiPropertyOptional({ description: 'Existing order line to keep or change' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({
    description: 'Product to add (when itemId is not given)',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Required when the product has variants',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiPropertyOptional({
    description:
      'Unit price. New lines default to the current shop price; existing lines keep their price.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;
}

export class UpdateOrderItemsDto {
  @ApiProperty({
    type: [OrderLineDto],
    description:
      'The complete list of lines. Existing lines left out are removed.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];

  @ApiPropertyOptional({
    description:
      'Set the discount by hand (BDT). Otherwise it stays as it was.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Set the shipping cost by hand (BDT)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Work out shipping again from the new subtotal',
  })
  @IsOptional()
  @IsBoolean()
  recalculateShipping?: boolean;

  @ApiPropertyOptional({
    description: 'Why the order was changed (added to the timeline)',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class PhoneOrderCustomerDto {
  @ApiPropertyOptional({
    description: 'Link the order to an existing customer account',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Email for the order confirmation (guest orders)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ type: PhoneOrderCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PhoneOrderCustomerDto)
  customer?: PhoneOrderCustomerDto;

  @ApiPropertyOptional({
    description:
      'A sale made over the counter: no delivery, no address, shipping 0',
  })
  @IsOptional()
  @IsBoolean()
  walkIn?: boolean;

  @ApiPropertyOptional({
    description: 'Walk-in only: customer name (optional)',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  walkInName?: string;

  @ApiPropertyOptional({
    description: 'Walk-in only: customer phone (optional)',
  })
  @IsOptional()
  @IsString()
  @IsBdMobile()
  walkInPhone?: string;

  @ApiPropertyOptional({
    type: OrderAddressDto,
    description: 'Delivery address (required unless walkIn)',
  })
  @ValidateIf((o: CreateOrderDto) => !o.walkIn)
  @ValidateNested()
  @Type(() => OrderAddressDto)
  shippingAddress?: OrderAddressDto;

  @ApiProperty({
    type: [OrderLineDto],
    description: 'Use productId (and variantId); itemId is not used here',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsIn(Object.values(PaymentMethod))
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Coupon code to apply' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Set the discount by hand instead of a coupon (BDT)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({
    description:
      'Set the shipping cost by hand (BDT). Otherwise it follows the shipping settings.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({
    description: 'Amount already received (records a payment)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({
    description: 'bKash transaction id for the amount received',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  transactionId?: string;

  @ApiPropertyOptional({ enum: ['PENDING', 'CONFIRMED'], default: 'CONFIRMED' })
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED'])
  status?: 'PENDING' | 'CONFIRMED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Send the order confirmation to the customer',
  })
  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}

export class RecordPaymentDto {
  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsIn(Object.values(PaymentMethod))
  method: PaymentMethod;

  @ApiPropertyOptional({ description: 'bKash transaction id / receipt number' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  transactionId?: string;

  @ApiPropertyOptional({ description: 'When the money arrived (default: now)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class RecordRefundDto {
  @ApiPropertyOptional({
    description: 'The payment being refunded. Defaults to the latest paid one.',
  })
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiProperty({ example: 500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: ['ORIGINAL_PAYMENT', 'STORE_CREDIT', 'BANK_TRANSFER'] })
  @IsIn(['ORIGINAL_PAYMENT', 'STORE_CREDIT', 'BANK_TRANSFER'])
  method: 'ORIGINAL_PAYMENT' | 'STORE_CREDIT' | 'BANK_TRANSFER';

  @ApiProperty({ example: 'Item damaged in transit' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ExportOrdersQueryDto extends OrderFilterDto {}

export class ShippingQuoteQueryDto {
  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ example: 'dhaka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({
    description: 'Comma separated product ids (free-shipping products)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  productIds?: string;
}
