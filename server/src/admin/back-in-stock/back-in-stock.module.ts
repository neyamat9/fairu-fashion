import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminBackInStockController } from './back-in-stock.controller';
import { AdminBackInStockService } from './back-in-stock.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminBackInStockController],
  providers: [AdminBackInStockService],
})
export class AdminBackInStockModule {}
