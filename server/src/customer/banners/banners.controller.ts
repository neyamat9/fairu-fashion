import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BannerPosition } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

class BannerQueryDto {
  @IsOptional()
  @IsEnum(BannerPosition)
  position?: BannerPosition;
}

@ApiTags('Customer - Banners')
@Controller('customer/banners')
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary:
      'Banners to show now: active, inside their start/end dates, in display order. Filter by position.',
  })
  @ApiQuery({ name: 'position', required: false, enum: BannerPosition })
  async list(@Query() q: BannerQueryDto) {
    const now = new Date();
    const rows = await this.prisma.banner.findMany({
      where: {
        isActive: true,
        ...(q.position ? { position: q.position } : {}),
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: [{ position: 'asc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        imageUrl: true,
        mobileImageUrl: true,
        linkUrl: true,
        linkType: true,
        linkResourceId: true,
        position: true,
        bgColor: true,
        textColor: true,
      },
    });
    return rows;
  }
}
