import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings';
import { MailService, escapeHtml, renderEmailLayout } from '../mail';
import { NotificationsService } from '../notifications';

const MAX_ATTEMPTS = 3;
const BATCH = 200;

export interface AlertResult {
  sent: number;
  failed: number;
  // Email is switched off: nothing was sent, requests stay waiting
  emailNotConfigured: boolean;
}

// Tells waiting customers that a product is back. Runs every minute and
// also on demand from the admin dashboard.
@Injectable()
export class BackInStockAlertService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackInStockAlertService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private settings: SettingsService,
    private notifications: NotificationsService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const every = Number(process.env.BACK_IN_STOCK_INTERVAL_MS) || 60_000;
    this.timer = setInterval(() => void this.run(), every);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<AlertResult> {
    if (this.running) return { sent: 0, failed: 0, emailNotConfigured: false };
    this.running = true;
    try {
      return await this.sendDue();
    } catch (error) {
      this.logger.error(
        `Back-in-stock run failed: ${error instanceof Error ? error.stack : String(error)}`,
      );
      return { sent: 0, failed: 0, emailNotConfigured: false };
    } finally {
      this.running = false;
    }
  }

  // Sends to every waiting request whose product (or variant) has stock
  // again. `only` limits it to one product / variant.
  async sendDue(only?: {
    productId: string;
    variantId?: string | null;
  }): Promise<AlertResult> {
    const result: AlertResult = {
      sent: 0,
      failed: 0,
      emailNotConfigured: false,
    };
    const waiting = await this.prisma.backInStockSubscription.findMany({
      where: {
        notified: false,
        attempts: { lt: MAX_ATTEMPTS },
        ...(only
          ? { productId: only.productId, variantKey: only.variantId ?? '' }
          : {}),
        product: { status: 'ACTIVE', stock: { gt: 0 } },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { where: { isMain: true }, take: 1, select: { url: true } },
          },
        },
      },
    });
    if (!waiting.length) return result;

    const variantIds = [
      ...new Set(
        waiting.map((w) => w.variantId).filter((x): x is string => !!x),
      ),
    ];
    const variants = variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, name: true, stock: true },
        })
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));
    const site = await this.settings.get('site');
    const base = (this.config.get<string>('frontend.url') ?? '').replace(
      /\/$/,
      '',
    );

    for (const sub of waiting) {
      const variant = sub.variantId
        ? variantById.get(sub.variantId)
        : undefined;
      // a request for one variant waits for THAT variant
      if (sub.variantId && (!variant || variant.stock <= 0)) continue;

      // Claim it first: if two servers run at once, only one sends.
      const claimed = await this.prisma.backInStockSubscription.updateMany({
        where: { id: sub.id, notified: false },
        data: { notified: true, notifiedAt: new Date() },
      });
      if (claimed.count === 0) continue;

      const name = variant
        ? `${sub.product.name} (${variant.name})`
        : sub.product.name;
      const link = `${base}/products/${sub.product.slug}`;
      const cancel = `${base}/back-in-stock/cancel?token=${sub.cancelToken}`;
      const sentOk = await this.mail
        .send({
          to: sub.email,
          subject: `${name} is back in stock`,
          text: `Good news! ${name} is back in stock at ${site.storeName}.\n\nBuy it: ${link}\n\nStop these alerts: ${cancel}`,
          html: renderEmailLayout(site, {
            title: `${name} is back in stock`,
            bodyHtml: `<h2 style="margin:0 0 12px;font-size:20px">Back in stock</h2>
<p style="margin:0 0 12px"><strong>${escapeHtml(name)}</strong> is available again. Stock is limited, so order soon.</p>
<p style="margin:20px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">View product</a></p>
<p style="margin:0;font-size:12px;color:#888">You asked us to tell you. <a href="${escapeHtml(cancel)}">Stop these alerts</a></p>`,
          }),
        })
        .catch((e: unknown) => ({
          ok: false as const,
          provider: 'error',
          error: e instanceof Error ? e.message : String(e),
        }));

      if (sentOk.ok) {
        result.sent++;
        if (sub.userId) {
          await this.notifications
            .notifyInApp(sub.userId, {
              type: 'BACK_IN_STOCK',
              title: `${name} is back in stock`,
              body: 'The product you were waiting for is available again.',
              data: { productId: sub.productId, productSlug: sub.product.slug },
            })
            .catch(() => undefined);
        }
        continue;
      }

      if (sentOk.provider === 'none') {
        // Email is off: keep every request waiting instead of using up its tries
        await this.prisma.backInStockSubscription.update({
          where: { id: sub.id },
          data: { notified: false, notifiedAt: null },
        });
        result.emailNotConfigured = true;
        break;
      }
      result.failed++;
      await this.prisma.backInStockSubscription.update({
        where: { id: sub.id },
        data: {
          notified: false,
          notifiedAt: null,
          attempts: { increment: 1 },
          lastError: String(sentOk.error ?? 'send failed').slice(0, 300),
        },
      });
    }
    return result;
  }
}
