import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogsController } from './activity-logs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ActivityLogsController],
})
export class AdminActivityLogsModule {}
