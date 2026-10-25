import { Module } from '@nestjs/common';
import { PingService } from './ping.service';
import { PingController } from './ping.controller';
import { PingResolver } from './ping.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PingController],
  providers: [PingService, PingResolver],
  exports: [PingService],
})
export class PingModule {}
