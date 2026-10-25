import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminFeedService } from './admin-feed.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AdminFeedService],
  exports: [AdminFeedService],
})
export class AdminFeedModule {}
