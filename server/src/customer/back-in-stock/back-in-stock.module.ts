import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CustomerBackInStockController } from './back-in-stock.controller';
import { CustomerBackInStockService } from './back-in-stock.service';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerBackInStockController],
  providers: [CustomerBackInStockService],
})
export class CustomerBackInStockModule {}
