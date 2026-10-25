import { Put } from '@nestjs/common';
import {
  DisplayOrderService,
  ReorderSubCategoriesDto,
} from '../../common/display-order';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SubCategoryService } from './sub-category.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles, ResponseMessage } from '../../common/decorators';

@ApiTags('Admin - Sub Categories')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/sub-category')
export class SubCategoryController {
  constructor(
    private readonly subCategoryService: SubCategoryService,
    private readonly displayOrder: DisplayOrderService,
  ) {}

  @Put('reorder')
  @ApiOperation({
    summary:
      'Save the display order of the sub-categories of one category. Send categoryId and all its sub-category ids in the wanted order.',
  })
  reorder(@Body() dto: ReorderSubCategoriesDto) {
    return this.displayOrder.reorder('subCategory', dto.ids, {
      categoryId: dto.categoryId,
    });
  }

  // Create a new sub-category
  @Post()
  @ResponseMessage('Sub-category created successfully')
  @ApiOperation({ summary: 'Create a new sub-category' })
  @ApiResponse({
    status: 201,
    description: 'The sub-category has been successfully created.',
  })
  @ApiResponse({ status: 404, description: 'Parent category not found.' })
  @ApiResponse({
    status: 409,
    description: 'Sub-category with this slug already exists.',
  })
  create(@Body() createSubCategoryDto: CreateSubCategoryDto) {
    return this.subCategoryService.create(createSubCategoryDto);
  }

  // Retrieve all sub-categories (including parent category info)
  @Get()
  @ResponseMessage('Sub-categories retrieved successfully')
  @ApiOperation({ summary: 'Get all sub-categories' })
  @ApiResponse({
    status: 200,
    description:
      'Return all sub-categories with their parent category details.',
  })
  findAll() {
    return this.subCategoryService.findAll();
  }

  //  Get a single sub-category by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get a sub-category by ID' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the sub-category',
  })
  @ApiResponse({ status: 200, description: 'Return the sub-category object.' })
  @ApiResponse({ status: 404, description: 'Sub-category not found.' })
  findOne(@Param('id') id: string) {
    return this.subCategoryService.findOne(id);
  }

  // Update a sub-category by ID
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing sub-category' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the sub-category',
  })
  @ApiResponse({
    status: 200,
    description: 'The sub-category has been successfully updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sub-category or Parent category not found.',
  })
  update(
    @Param('id') id: string,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
  ) {
    return this.subCategoryService.update(id, updateSubCategoryDto);
  }

  // Delete a sub-category by ID
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sub-category' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the sub-category',
  })
  @ApiResponse({
    status: 200,
    description: 'The sub-category has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Sub-category not found.' })
  remove(@Param('id') id: string) {
    return this.subCategoryService.remove(id);
  }
}
