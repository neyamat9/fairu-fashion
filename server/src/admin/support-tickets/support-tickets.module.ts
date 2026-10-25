import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminSupportTicketsController } from './support-tickets.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminSupportTicketsController],
})
export class AdminSupportTicketsModule {}
