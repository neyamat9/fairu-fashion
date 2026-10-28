import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { StorefrontSyncService } from '../../common/storefront/storefront-sync.service';

// Starts and ends scheduled promotions. A promotion is stored on the product
// (discountPrice + discountStart/End); this job moves the live price
// (sellingPrice) at the right time. Both queries are idempotent, so running on
// several servers at once is harmless.
@Injectable()
export class DiscountSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscountSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private storefront: StorefrontSyncService,
  ) {}

  onModuleInit() {
    const raw = process.env.DISCOUNT_SCHEDULER_INTERVAL_MS;
    const every = raw !== undefined ? Number(raw) : 3_600_000;
    if (every <= 0) return;
    this.timer = setInterval(() => void this.run(), every);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run(now = new Date()) {
    if (this.running) return { started: 0, ended: 0 };
    this.running = true;
    try {
      const ended = await this.endExpired(now);
      const started = await this.startDue(now);
      if (ended.length || started.length) {
        await this.recordHistory([...ended, ...started]);
        this.cache.delByPrefix('products:');
        // prices changed on their own: refresh the shop too
        this.storefront.notify(['products', 'home']);
        this.logger.log(
          `Promotions: ${started.length} started, ${ended.length} ended`,
        );
      }
      return { started: started.length, ended: ended.length };
    } catch (error) {
      this.logger.error(
        `Discount scheduler failed: ${error instanceof Error ? error.stack : String(error)}`,
      );
      return { started: 0, ended: 0 };
    } finally {
      this.running = false;
    }
  }

  private async endExpired(
    now: Date,
  ): Promise<{ id: string; price: string }[]> {
    return this.prisma.$queryRaw<{ id: string; price: string }[]>(Prisma.sql`
      UPDATE "Product"
      SET "sellingPrice" = "priceBeforeDiscount",
          "isDiscounted" = ("priceBeforeDiscount" < "regularPrice"),
          "priceBeforeDiscount" = NULL,
          "discountPrice" = NULL,
          "discountStart" = NULL,
          "discountEnd" = NULL,
          "discountLabel" = NULL,
          "updatedAt" = ${now}
      WHERE "priceBeforeDiscount" IS NOT NULL
        AND "discountEnd" IS NOT NULL
        AND "discountEnd" <= ${now}
      RETURNING id, "sellingPrice"::text AS price`);
  }

  private async startDue(now: Date): Promise<{ id: string; price: string }[]> {
    return this.prisma.$queryRaw<{ id: string; price: string }[]>(Prisma.sql`
      UPDATE "Product"
      SET "priceBeforeDiscount" = "sellingPrice",
          "sellingPrice" = "discountPrice",
          "isDiscounted" = ("discountPrice" < "regularPrice"),
          "updatedAt" = ${now}
      WHERE "discountPrice" IS NOT NULL
        AND "priceBeforeDiscount" IS NULL
        AND "discountPrice" < "sellingPrice"
        AND ("discountStart" IS NULL OR "discountStart" <= ${now})
        AND ("discountEnd" IS NULL OR "discountEnd" > ${now})
      RETURNING id, "sellingPrice"::text AS price`);
  }

  private async recordHistory(rows: { id: string; price: string }[]) {
    await this.prisma.priceHistory.createMany({
      data: rows.map((r) => ({ productId: r.id, price: r.price })),
    });
  }
}
