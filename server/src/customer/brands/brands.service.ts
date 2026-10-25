import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet(
      'brands:all',
      () =>
        this.prisma.brand.findMany({
          where: { status: 'ACTIVE' },
          include: { _count: { select: { products: true } } },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        }),
      600, // 10 minutes
    );
  }

  async findBySlug(slug: string) {
    return this.cache.getOrSet(
      `brands:slug:${slug}`,
      () =>
        this.prisma.brand.findUnique({
          where: { slug, status: 'ACTIVE' },
          include: { _count: { select: { products: true } } },
        }),
      600,
    );
  }
}
