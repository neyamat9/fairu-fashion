import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(
      'categories:tree',
      () =>
        this.prisma.category.findMany({
          where: { status: 'ACTIVE' },
          include: {
            subCategories: {
              where: { status: 'ACTIVE' },
              orderBy: { displayOrder: 'asc' },
            },
            _count: { select: { products: true } },
          },
          orderBy: { displayOrder: 'asc' },
        }),
      600, // 10 minutes TTL
    );
  }

  async findBySlug(slug: string) {
    const category = await this.cache.getOrSet(
      `categories:slug:${slug}`,
      () =>
        this.prisma.category.findUnique({
          where: { slug, status: 'ACTIVE' },
          include: {
            subCategories: {
              where: { status: 'ACTIVE' },
              orderBy: { displayOrder: 'asc' },
            },
            _count: { select: { products: true } },
          },
        }),
      600,
    );
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // Active sub-categories of a category (e.g. Accessories → Chargers, Cases,
  // Earbuds), each with its number of active products.
  async findSubCategories(slug: string) {
    const result = await this.cache.getOrSet(
      `categories:subs:${slug}`,
      async () => {
        const category = await this.prisma.category.findUnique({
          where: { slug, status: 'ACTIVE' },
          select: { id: true, name: true, slug: true, image: true, icon: true },
        });
        if (!category) return null;

        const subCategories = await this.prisma.subCategory.findMany({
          where: { parentCategoryId: category.id, status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            icon: true,
            description: true,
            displayOrder: true,
            _count: { select: { products: { where: { status: 'ACTIVE' } } } },
          },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        });

        return {
          category,
          subCategories: subCategories.map(({ _count, ...s }) => ({
            ...s,
            productCount: _count.products,
          })),
        };
      },
      600,
    );
    if (!result) throw new NotFoundException('Category not found');
    return result;
  }
}
