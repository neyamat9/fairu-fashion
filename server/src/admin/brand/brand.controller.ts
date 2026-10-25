import { Put } from '@nestjs/common';
import { DisplayOrderService, ReorderDto } from '../../common/display-order';
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
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
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

@ApiTags('Admin - Brands')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/brand')
export class BrandController {
  constructor(
    private readonly brandService: BrandService,
    private readonly displayOrder: DisplayOrderService,
  ) {}

  @Put('reorder')
  @ApiOperation({
    summary:
      'Save the display order of brands (drag & drop). Send all ids in the wanted order.',
  })
  reorder(@Body() dto: ReorderDto) {
    return this.displayOrder.reorder('brand', dto.ids);
  }

  // Create a new brand

  @Post()
  @ResponseMessage('Brand created successfully')
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiResponse({
    status: 201,
    description: 'The brand has been successfully created.',
  })
  @ApiResponse({
    status: 409,
    description: 'Brand with this slug already exists.',
  })
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandService.create(createBrandDto);
  }

  // Retrieve all brands
  @Get()
  @ResponseMessage('Brands retrieved successfully')
  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({ status: 200, description: 'Return all brands.' })
  findAll() {
    return this.brandService.findAll();
  }

  //  Get a single brand by ID
  @Get(':id')
  @ApiOperation({ summary: 'Get a brand by ID' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the brand' })
  @ApiResponse({ status: 200, description: 'Return the brand object.' })
  @ApiResponse({ status: 404, description: 'Brand not found.' })
  findOne(@Param('id') id: string) {
    return this.brandService.findOne(id);
  }

  //  Update a brand by ID
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing brand' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the brand' })
  @ApiResponse({
    status: 200,
    description: 'The brand has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Brand not found.' })
  update(@Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandService.update(id, updateBrandDto);
  }

  // Delete a brand by ID
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a brand' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the brand' })
  @ApiResponse({
    status: 200,
    description: 'The brand has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Brand not found.' })
  remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }
}
