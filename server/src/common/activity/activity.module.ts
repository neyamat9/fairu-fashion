import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityInterceptor } from './activity.interceptor';
import { ActivityLogService } from './activity-log.service';
import { ActivityMiddleware } from './activity.middleware';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    ActivityLogService,
    ActivityMiddleware,
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
  exports: [ActivityLogService, ActivityMiddleware],
})
export class ActivityModule {}
