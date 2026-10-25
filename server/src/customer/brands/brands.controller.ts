import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BrandsService } from './brands.service';

@ApiTags('Customer - Brands')
@Controller('customer/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active brands' })
  async findAll() {
    return this.brandsService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get brand by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.brandsService.findBySlug(slug);
  }
}
