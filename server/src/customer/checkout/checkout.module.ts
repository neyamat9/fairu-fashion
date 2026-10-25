import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
import { CouponsService } from '../coupons/coupons.service';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [PrismaModule, ShippingModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, CouponsService],
  exports: [CheckoutService, CouponsService],
})
export class CheckoutModule {}
