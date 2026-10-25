import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Injectable()
export class SubCategoryService {
  constructor(private prisma: PrismaService) {}

  async create(createSubCategoryDto: CreateSubCategoryDto) {
    const existing = await this.prisma.subCategory.findUnique({
      where: { slug: createSubCategoryDto.slug },
    });
    if (existing) {
      throw new ConflictException('SubCategory with this slug already exists');
    }

    // Verify parent category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createSubCategoryDto.parentCategoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Parent Category with ID ${createSubCategoryDto.parentCategoryId} not found`,
      );
    }

    return this.prisma.subCategory.create({
      data: createSubCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.subCategory.findMany({
      include: {
        parentCategory: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id },
      include: {
        parentCategory: true,
      },
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }
    return subCategory;
  }

  async update(id: string, updateSubCategoryDto: UpdateSubCategoryDto) {
    await this.findOne(id);

    if (updateSubCategoryDto.parentCategoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateSubCategoryDto.parentCategoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Parent Category with ID ${updateSubCategoryDto.parentCategoryId} not found`,
        );
      }
    }

    return this.prisma.subCategory.update({
      where: { id },
      data: updateSubCategoryDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subCategory.delete({
      where: { id },
    });
  }
}
