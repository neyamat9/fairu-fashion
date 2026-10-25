import {
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
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { sendTable } from '../../common/export/table-export';
import { AdminCouponsService } from './coupons.service';
import {
  BulkGenerateCouponsDto,
  CreateCouponDto,
  ListCouponsDto,
  UpdateCouponDto,
  UsageExportDto,
  UsageQueryDto,
} from './dto/coupon.dto';

@ApiTags('Admin - Coupons')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly coupons: AdminCouponsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List coupons with search and state filter (active, scheduled, expired, inactive, used-up)',
  })
  findAll(@Query() q: ListCouponsDto) {
    return this.coupons.findAll(q);
  }

  @Post('bulk-generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create up to 1000 unique codes at once with the same rules (default: single use each). format csv/xlsx downloads the codes.',
  })
  async bulkGenerate(
    @Body() dto: BulkGenerateCouponsDto,
    @CurrentUser() admin: User,
    @Res() res: Response,
  ) {
    const result = await this.coupons.bulkGenerate(dto, admin.id);
    if (dto.format === 'json') {
      res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Operation successful',
        data: result,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    await sendTable(res, dto.format, {
      title: 'Coupon codes',
      filename: `coupon-codes-${dto.prefix ?? 'batch'}`,
      meta: { Codes: result.count, Description: result.description },
      columns: [{ key: 'code', header: 'Code' }],
      rows: result.codes.map((code) => ({ code })),
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Coupon with its rules, state and the 20 latest uses',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coupons.findOne(id);
  }

  @Get(':id/usage')
  @ApiOperation({
    summary:
      'Usage report: totals (uses, discount given, customers, order revenue, remaining) and every use with customer and order',
  })
  usage(@Param('id', ParseUUIDPipe) id: string, @Query() q: UsageQueryDto) {
    return this.coupons.usageReport(id, q);
  }

  @Get(':id/usage/export')
  @ApiOperation({ summary: 'Download every use of the coupon as CSV or Excel' })
  async usageExport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: UsageExportDto,
    @Res() res: Response,
  ) {
    await sendTable(res, q.format, await this.coupons.usageTable(id));
  }

  @Get(':id/users')
  @ApiOperation({
    summary:
      'Per-customer usage: how many times each customer used this coupon',
  })
  users(@Param('id', ParseUUIDPipe) id: string, @Query() q: UsageQueryDto) {
    return this.coupons.usersReport(id, q);
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  create(@Body() dto: CreateCouponDto, @CurrentUser() admin: User) {
    return this.coupons.create(dto, admin.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() admin: User,
  ) {
    return this.coupons.update(id, dto, admin.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Delete a coupon that has never been used (otherwise switch it off)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: User) {
    return this.coupons.remove(id, admin.id);
  }
}
