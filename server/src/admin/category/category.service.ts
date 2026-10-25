import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: createCategoryDto.slug },
    });
    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    const created = await this.prisma.category.create({
      data: createCategoryDto,
    });
    this.cache.delByPrefix('categories:');
    return created;
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        subCategories: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
      },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);
    const updated = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
    this.cache.delByPrefix('categories:');
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const deleted = await this.prisma.category.delete({
      where: { id },
    });
    this.cache.delByPrefix('categories:');
    return deleted;
  }
}
