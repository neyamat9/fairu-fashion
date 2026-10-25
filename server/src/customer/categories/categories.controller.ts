import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('Customer - Categories')
@Controller('customer/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active categories with subcategories' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':slug/sub-categories')
  @ApiOperation({
    summary: 'Active sub-categories of a category, with product counts',
  })
  async findSubCategories(@Param('slug') slug: string) {
    return this.categoriesService.findSubCategories(slug);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }
}
