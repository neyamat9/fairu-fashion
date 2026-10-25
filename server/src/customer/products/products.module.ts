import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { HomeController } from './home.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, HomeController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
