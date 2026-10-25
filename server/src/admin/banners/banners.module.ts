import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminBannersController } from './banners.controller';
import { AdminBannersService } from './banners.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminBannersController],
  providers: [AdminBannersService],
})
export class AdminBannersModule {}
