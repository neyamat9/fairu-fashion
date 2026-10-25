import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminFlashDealsController } from './flash-deals.controller';
import { AdminFlashDealsService } from './flash-deals.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminFlashDealsController],
  providers: [AdminFlashDealsService],
})
export class AdminFlashDealsModule {}
