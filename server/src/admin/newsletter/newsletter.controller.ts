import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { Response } from 'express';
import { NewsletterStatus, Prisma, Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

class ListSubscribersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: NewsletterStatus })
  @IsOptional()
  @IsIn(Object.values(NewsletterStatus))
  status?: NewsletterStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

@ApiTags('Admin - Newsletter')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/newsletter')
export class AdminNewsletterController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List newsletter subscribers with counts' })
  async list(@Query() q: ListSubscribersDto) {
    const where: Prisma.NewsletterSubscriberWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.search?.trim()
        ? { email: { contains: q.search.trim(), mode: 'insensitive' } }
        : {}),
    };
    const [data, total, subscribed, unsubscribed] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        omit: { unsubscribeToken: true },
      }),
      this.prisma.newsletterSubscriber.count({ where }),
      this.prisma.newsletterSubscriber.count({
        where: { status: 'SUBSCRIBED' },
      }),
      this.prisma.newsletterSubscriber.count({
        where: { status: 'UNSUBSCRIBED' },
      }),
    ]);
    return {
      data,
      stats: { subscribed, unsubscribed },
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Download active subscribers as CSV' })
  async export(@Res({ passthrough: true }) res: Response) {
    const rows = await this.prisma.newsletterSubscriber.findMany({
      where: { status: 'SUBSCRIBED' },
      orderBy: { subscribedAt: 'asc' },
      select: { email: true, source: true, subscribedAt: true },
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    const lines = rows.map((r) =>
      [r.email, r.source ?? '', r.subscribedAt.toISOString()]
        .map(csvCell)
        .join(','),
    );
    return ['email,source,subscribedAt', ...lines].join('\r\n');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a subscriber' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const deleted = await this.prisma.newsletterSubscriber.deleteMany({
      where: { id },
    });
    if (!deleted.count) throw new NotFoundException('Subscriber not found');
    return { success: true };
  }
}

// Quotes a CSV cell and neutralises spreadsheet formulas (=, +, -, @).
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
