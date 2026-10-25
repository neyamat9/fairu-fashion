import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CheckoutModule } from '../../customer/checkout/checkout.module';
import { ShippingModule } from '../../customer/shipping/shipping.module';
import { AdminOrdersController } from './orders.controller';
import { AdminOrdersService } from './orders.service';
import { OrderEditService } from './order-edit.service';
import { OrderPaymentsService } from './order-payments.service';

@Module({
  imports: [PrismaModule, CheckoutModule, ShippingModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService, OrderEditService, OrderPaymentsService],
})
export class AdminOrdersModule {}
