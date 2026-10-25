import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BackInStockAlertService } from './back-in-stock.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BackInStockAlertService],
  exports: [BackInStockAlertService],
})
export class BackInStockModule {}
