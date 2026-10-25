import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminContactMessagesController } from './contact-messages.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminContactMessagesController],
})
export class AdminContactMessagesModule {}
