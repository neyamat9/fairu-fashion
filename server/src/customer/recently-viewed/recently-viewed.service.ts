import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CartOwner } from '../../common/cart/cart-owner';
import { cardSelect, toCard } from '../products/products.service';
import { TrackViewDto } from './recently-viewed.dto';

// How many products are remembered per customer / guest.
const MAX_REMEMBERED = 30;
const GUEST_TTL_DAYS = 30;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class RecentlyViewedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecentlyViewedService.name);
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.cleanupExpiredGuests();
    }, CLEANUP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async track(owner: CartOwner, dto: TrackViewDto) {
    if (!dto.productId && !dto.slug) {
      throw new BadRequestException('Send productId or slug');
    }
    const product = await this.prisma.product.findFirst({
      where: {
        status: 'ACTIVE',
        ...(dto.productId ? { id: dto.productId } : { slug: dto.slug }),
      },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.touch(owner, product.id);
    await this.prune(owner);
    return { success: true };
  }

  async list(owner: CartOwner, limit = 12, exclude?: string) {
    const rows = await this.prisma.recentlyViewedProduct.findMany({
      where: {
        ...this.ownerWhere(owner),
        product: { status: 'ACTIVE' },
        ...(exclude ? { productId: { not: exclude } } : {}),
      },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      select: { viewedAt: true, product: { select: cardSelect } },
    });
    return rows.map((r) => ({ ...toCard(r.product), viewedAt: r.viewedAt }));
  }

  async clear(owner: CartOwner) {
    await this.prisma.recentlyViewedProduct.deleteMany({
      where: this.ownerWhere(owner),
    });
    return { success: true };
  }

  // After login/registration: the guest's history joins the account's.
  async mergeGuest(userId: string, guestToken: string) {
    await this.prisma.$transaction(async (tx) => {
      const guestRows = await tx.recentlyViewedProduct.findMany({
        where: { guestToken, userId: null },
      });
      for (const g of guestRows) {
        const mine = await tx.recentlyViewedProduct.findFirst({
          where: { userId, productId: g.productId },
        });
        if (mine) {
          if (g.viewedAt > mine.viewedAt) {
            await tx.recentlyViewedProduct.update({
              where: { id: mine.id },
              data: { viewedAt: g.viewedAt },
            });
          }
          await tx.recentlyViewedProduct.delete({ where: { id: g.id } });
        } else {
          await tx.recentlyViewedProduct.update({
            where: { id: g.id },
            data: { userId, guestToken: null },
          });
        }
      }
    });
    await this.prune({ userId });
  }

  // Create the row, or just bump viewedAt when the product was seen before.
  private async touch(owner: CartOwner, productId: string) {
    const now = new Date();
    const existing = await this.prisma.recentlyViewedProduct.findFirst({
      where: { ...this.ownerWhere(owner), productId },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.recentlyViewedProduct.update({
        where: { id: existing.id },
        data: { viewedAt: now },
      });
      return;
    }
    try {
      await this.prisma.recentlyViewedProduct.create({
        data: {
          productId,
          userId: owner.userId ?? null,
          guestToken: owner.guestToken ?? null,
          viewedAt: now,
        },
      });
    } catch (error) {
      // A parallel request created it first: that view is as good as ours.
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
      ) {
        throw error;
      }
    }
  }

  private async prune(owner: CartOwner) {
    const extra = await this.prisma.recentlyViewedProduct.findMany({
      where: this.ownerWhere(owner),
      orderBy: { viewedAt: 'desc' },
      skip: MAX_REMEMBERED,
      select: { id: true },
    });
    if (extra.length) {
      await this.prisma.recentlyViewedProduct.deleteMany({
        where: { id: { in: extra.map((e) => e.id) } },
      });
    }
  }

  private ownerWhere(owner: CartOwner): Prisma.RecentlyViewedProductWhereInput {
    return owner.userId
      ? { userId: owner.userId }
      : { guestToken: owner.guestToken, userId: null };
  }

  private async cleanupExpiredGuests() {
    try {
      const { count } = await this.prisma.recentlyViewedProduct.deleteMany({
        where: {
          userId: null,
          viewedAt: { lt: new Date(Date.now() - GUEST_TTL_DAYS * 86400000) },
        },
      });
      if (count) this.logger.log(`Removed ${count} expired guest views`);
    } catch (error) {
      this.logger.warn(
        `Recently-viewed cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
