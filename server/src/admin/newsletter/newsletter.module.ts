import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminNewsletterController } from './newsletter.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminNewsletterController],
})
export class AdminNewsletterModule {}
