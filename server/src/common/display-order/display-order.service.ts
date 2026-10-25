import { BadRequestException, Injectable } from '@nestjs/common';
import { BannerPosition } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache';

export type OrderedModel = 'category' | 'subCategory' | 'brand' | 'banner';

// Saves a drag-and-drop order: displayOrder = the position in the list.
// The list must name EVERY item of the group exactly once, so two items can
// never end up with the same position and nothing is silently skipped.
@Injectable()
export class DisplayOrderService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async reorder(
    model: OrderedModel,
    ids: string[],
    scope: { categoryId?: string; position?: BannerPosition } = {},
  ) {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Each id may appear only once');
    }
    const current = await this.currentIds(model, scope);
    const wanted = new Set(ids);
    const unknown = ids.filter((id) => !current.has(id));
    if (unknown.length) {
      throw new BadRequestException(
        `Not part of this list: ${unknown.slice(0, 5).join(', ')}`,
      );
    }
    const missing = [...current].filter((id) => !wanted.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `The list must contain all ${current.size} items. Missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`,
      );
    }

    await this.prisma.$transaction(
      ids.map((id, displayOrder) => this.update(model, id, displayOrder)),
    );
    this.cache.delByPrefix(
      model === 'brand'
        ? 'brands:'
        : model === 'banner'
          ? 'banners:'
          : 'categories:',
    );
    this.cache.delByPrefix('home');
    return { success: true, count: ids.length, ids };
  }

  private async currentIds(
    model: OrderedModel,
    scope: { categoryId?: string; position?: BannerPosition },
  ) {
    let rows: { id: string }[];
    switch (model) {
      case 'category':
        rows = await this.prisma.category.findMany({ select: { id: true } });
        break;
      case 'brand':
        rows = await this.prisma.brand.findMany({ select: { id: true } });
        break;
      case 'subCategory':
        rows = await this.prisma.subCategory.findMany({
          where: { parentCategoryId: scope.categoryId },
          select: { id: true },
        });
        break;
      case 'banner':
        rows = await this.prisma.banner.findMany({
          where: { position: scope.position },
          select: { id: true },
        });
        break;
    }
    return new Set(rows.map((r) => r.id));
  }

  private update(model: OrderedModel, id: string, displayOrder: number) {
    const args = { where: { id }, data: { displayOrder } };
    switch (model) {
      case 'category':
        return this.prisma.category.update(args);
      case 'brand':
        return this.prisma.brand.update(args);
      case 'subCategory':
        return this.prisma.subCategory.update(args);
      case 'banner':
        return this.prisma.banner.update(args);
    }
  }
}
