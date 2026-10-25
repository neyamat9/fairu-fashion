import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBannerDto, UpdateBannerDto } from './banner.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminBannersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({
      orderBy: [{ position: 'asc' }, { displayOrder: 'asc' }],
    });
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async create(data: CreateBannerDto) {
    if (data.startDate && data.endDate && data.endDate <= data.startDate)
      throw new BadRequestException(
        'The end date must be after the start date',
      );
    return this.prisma.banner.create({ data });
  }

  async update(id: string, data: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    const start =
      data.startDate === undefined ? banner.startDate : data.startDate;
    const end = data.endDate === undefined ? banner.endDate : data.endDate;
    if (start && end && end <= start)
      throw new BadRequestException(
        'The end date must be after the start date',
      );
    return this.prisma.banner.update({ where: { id }, data });
  }

  async remove(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    await this.prisma.banner.delete({ where: { id } });
    return { success: true };
  }
}
