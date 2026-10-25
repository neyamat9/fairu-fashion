import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DisplayOrderService } from './display-order.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [DisplayOrderService],
  exports: [DisplayOrderService],
})
export class DisplayOrderModule {}
