import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminReturnsController } from './returns.controller';
import { AdminReturnsService } from './returns.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminReturnsController],
  providers: [AdminReturnsService],
})
export class AdminReturnsModule {}
