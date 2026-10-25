import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  MAX_ADMIN_FILES_PER_REQUEST,
  MAX_ADMIN_UPLOAD_BYTES,
} from '../../common/uploads';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { ProductService, normalizeTags } from './product.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductImagesService } from './product-images.service';
import {
  CreateProductDto,
  ProductVariantInputDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  AdminProductQueryDto,
  AttachImagesDto,
  ImageUploadQueryDto,
  ReorderImagesDto,
  SetTagsDto,
  UpdateImageDto,
  UpdateVariantDto,
} from './dto/product-admin.dto';

@ApiTags('Admin - Products')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/products')
export class ProductController {
  constructor(
    private readonly products: ProductService,
    private readonly variants: ProductVariantsService,
    private readonly images: ProductImagesService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List products with search (name, code, brand, SKU) and filters: status, category, brand, stock (in/low/out), sort',
  })
  findAll(@Query() query: AdminProductQueryDto) {
    return this.products.findAll(query);
  }

  // Declared before ':id' so "stats" and "tags" are not read as an id.
  @Get('stats')
  @ApiOperation({
    summary:
      'Numbers for the cards above the list: totals, live/hidden, low and out of stock, stock value, best seller (30 days), on discount',
  })
  stats() {
    return this.products.stats();
  }

  @Get('tags')
  @ApiOperation({ summary: 'All tags in use, most used first' })
  async popularTags() {
    const rows = await this.prisma.productTag.groupBy({
      by: ['tag'],
      _count: { tag: true },
      orderBy: [{ _count: { tag: 'desc' } }, { tag: 'asc' }],
      take: 200,
    });
    return rows.map((r) => ({ tag: r.tag, products: r._count.tag }));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Product detail: photos, variants, tags, specs, price history',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a product (slug is made from the name when omitted). Optional: opening stock, variants, tags, scheduled discount.',
  })
  @ApiResponse({ status: 201, description: 'Product created.' })
  @ApiResponse({
    status: 409,
    description: 'Name, slug, product code or SKU already used.',
  })
  create(@Body() dto: CreateProductDto, @CurrentUser() admin: User) {
    return this.products.create(dto, admin.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Edit a product. Only the fields you send change; tags, attributes and specifications replace the old list.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() admin: User,
  ) {
    return this.products.update(id, dto, admin.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary:
      'Copy a product (draft, no stock, new SKUs, photos copied) to start a similar one',
  })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: User,
  ) {
    return this.products.duplicate(id, admin.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a product. One that has orders is deactivated instead.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: User) {
    return this.products.remove(id, admin.id);
  }

  // ---------- tags ----------

  @Put(':id/tags')
  @ApiOperation({ summary: 'Replace the tags of a product' })
  async setTags(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTagsDto,
  ) {
    await this.products.assertExists(id);
    const tags = normalizeTags(dto.tags);
    await this.prisma.$transaction([
      this.prisma.productTag.deleteMany({ where: { productId: id } }),
      this.prisma.productTag.createMany({
        data: tags.map((tag) => ({ tag, productId: id })),
      }),
    ]);
    this.cache.delByPrefix('products:');
    return { tags };
  }

  // ---------- variants ----------

  @Get(':id/variants')
  @ApiOperation({
    summary: 'Variants of a product (colour, storage...) with their stock',
  })
  listVariants(@Param('id', ParseUUIDPipe) id: string) {
    return this.variants.list(id);
  }

  @Post(':id/variants')
  @ApiOperation({
    summary:
      'Add a variant. The first one takes over the existing product stock.',
  })
  addVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductVariantInputDto,
    @CurrentUser() admin: User,
  ) {
    return this.variants.create(id, dto, admin.id);
  }

  @Patch(':id/variants/:variantId')
  @ApiOperation({
    summary:
      'Edit a variant (stock is changed through /admin/inventory/adjust)',
  })
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
    @CurrentUser() admin: User,
  ) {
    return this.variants.update(id, variantId, dto, admin.id);
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a variant that has never been ordered' })
  removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentUser() admin: User,
  ) {
    return this.variants.remove(id, variantId, admin.id);
  }

  // ---------- photos ----------

  @Get(':id/images')
  @ApiOperation({ summary: 'Photos of a product in display order' })
  async listImages(@Param('id', ParseUUIDPipe) id: string) {
    await this.products.assertExists(id);
    return this.images.list(id);
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', MAX_ADMIN_FILES_PER_REQUEST, {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_ADMIN_UPLOAD_BYTES,
        files: MAX_ADMIN_FILES_PER_REQUEST,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOperation({
    summary:
      'Upload photos (JPG/PNG/WebP/GIF) and add them to the product. The first becomes the main photo.',
  })
  uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: ImageUploadQueryDto,
    @CurrentUser() admin: User,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'Attach at least one image in the "files" field',
      );
    }
    return this.images.upload(id, admin.id, files, q.alt);
  }

  @Post(':id/images/attach')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add photos from the media library (uploadIds) or from https URLs',
  })
  attachImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttachImagesDto,
  ) {
    return this.images.attach(id, dto);
  }

  @Put(':id/images/order')
  @ApiOperation({
    summary: 'Set the display order of the photos (list every photo id)',
  })
  reorderImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderImagesDto,
  ) {
    return this.images.reorder(id, dto);
  }

  @Patch(':id/images/:imageId')
  @ApiOperation({ summary: 'Change alt text or make this the main photo' })
  updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateImageDto,
  ) {
    return this.images.update(id, imageId, dto);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Remove a photo from the product (the file stays in the media library)',
  })
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.images.remove(id, imageId);
  }
}
