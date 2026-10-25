import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductService } from './product.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductImagesService } from './product-images.service';
import { DiscountSchedulerService } from './discount-scheduler.service';
import { ProductController } from './product.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductVariantsService,
    ProductImagesService,
    DiscountSchedulerService,
  ],
  exports: [ProductService],
})
export class ProductModule {}
