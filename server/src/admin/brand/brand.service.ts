import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(createBrandDto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { slug: createBrandDto.slug },
    });
    if (existing) {
      throw new ConflictException('Brand with this slug already exists');
    }

    const created = await this.prisma.brand.create({
      data: createBrandDto,
    });
    this.cache.delByPrefix('brands:');
    return created;
  }

  async findAll() {
    return this.prisma.brand.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return brand;
  }

  async update(id: string, updateBrandDto: UpdateBrandDto) {
    await this.findOne(id);
    const updated = await this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
    });
    this.cache.delByPrefix('brands:');
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.prisma.brand.delete({
      where: { id },
    });
    this.cache.delByPrefix('brands:');
    return deleted;
  }
}
