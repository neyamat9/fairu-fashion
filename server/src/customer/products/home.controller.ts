import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Customer - Home')
@Controller('customer/home')
export class HomeController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Home page in one call: featured, new arrivals, best sellers, on sale, home categories and brands',
  })
  async home() {
    return this.productsService.home();
  }
}
