import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsService } from './uploads.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
