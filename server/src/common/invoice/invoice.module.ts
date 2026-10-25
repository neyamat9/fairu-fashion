import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoiceService } from './invoice.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
