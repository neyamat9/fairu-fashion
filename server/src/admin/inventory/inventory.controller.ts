import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { csvLine } from '../../common/utils/csv';
import {
  AdjustStockDto,
  BulkStockQueryDto,
  InventoryListDto,
  StockLogQueryDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

const CSV_CHUNK = 1000;

@ApiTags('Admin - Inventory')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Stock overview: counts, units on hand, stock value',
  })
  summary() {
    return this.inventory.summary();
  }

  @Get('items')
  @ApiOperation({
    summary:
      'Stock per sellable item (product or variant). state=low|out filters; search by name/SKU.',
  })
  items(@Query() q: InventoryListDto) {
    return this.inventory.items(q);
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Items at or below their low-stock level (but not zero)',
  })
  low(@Query() q: InventoryListDto) {
    return this.inventory.items({ ...q, state: 'low' });
  }

  @Get('out-of-stock')
  @ApiOperation({ summary: 'Items with no stock left' })
  out(@Query() q: InventoryListDto) {
    return this.inventory.items({ ...q, state: 'out' });
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Add, remove or set the stock of a product/variant with a reason. Recorded in the stock log.',
  })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() admin: User) {
    return this.inventory.adjust(dto, admin.id);
  }

  @Get('logs')
  @ApiOperation({
    summary: 'Stock history: who changed what, why, before/after',
  })
  logs(@Query() q: StockLogQueryDto) {
    return this.inventory.logs(q);
  }

  @Get('export')
  @ApiOperation({
    summary:
      'Download the stock of every item as CSV (the same format bulk-update reads)',
  })
  async export(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stock-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.write(
      csvLine([
        'sku',
        'stock',
        'product',
        'variant',
        'status',
        'lowStockLevel',
        'cost',
        'price',
      ]) + '\r\n',
    );
    for (let offset = 0; ; offset += CSV_CHUNK) {
      const rows = await this.inventory.exportRows(offset, CSV_CHUNK);
      for (const r of rows) {
        res.write(
          csvLine([
            r.sku ?? '',
            r.stock,
            r.productName,
            r.variantName ?? '',
            r.status,
            r.threshold,
            r.cost,
            r.retail,
          ]) + '\r\n',
        );
      }
      if (rows.length < CSV_CHUNK) break;
    }
    res.end();
  }

  @Post('bulk-update')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary:
      'Update many stock levels from a CSV (columns: sku, stock [, note]). mode=set|add, dryRun=true only checks.',
  })
  bulk(
    @Query() q: BulkStockQueryDto,
    @CurrentUser() admin: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file)
      throw new BadRequestException('Attach a CSV file in the "file" field');
    return this.inventory.bulkUpdate(
      file.buffer.toString('utf8'),
      q.mode,
      q.dryRun,
      admin.id,
    );
  }
}
