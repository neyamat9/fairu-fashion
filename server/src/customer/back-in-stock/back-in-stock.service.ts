import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscribeBackInStockDto } from './back-in-stock.dto';

const MAX_WAITING_PER_EMAIL = 20;

@Injectable()
export class CustomerBackInStockService {
  constructor(private prisma: PrismaService) {}

  async subscribe(dto: SubscribeBackInStockDto, user?: User) {
    const email = (user?.email ?? dto.email)?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Enter your email address');

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        name: true,
        status: true,
        stock: true,
        variants: { select: { id: true, name: true, stock: true } },
      },
    });
    if (
      !product ||
      product.status === 'DRAFT' ||
      product.status === 'DISCONTINUED'
    ) {
      throw new NotFoundException('Product not found');
    }

    let variantId: string | null = null;
    let outOfStock: boolean;
    if (product.variants.length) {
      if (!dto.variantId)
        throw new BadRequestException(
          'Choose which option you are waiting for',
        );
      const v = product.variants.find((x) => x.id === dto.variantId);
      if (!v)
        throw new BadRequestException(
          'That option does not belong to this product',
        );
      variantId = v.id;
      outOfStock = v.stock <= 0;
    } else {
      if (dto.variantId)
        throw new BadRequestException('This product has no options');
      outOfStock = product.stock <= 0;
    }
    if (!outOfStock) {
      throw new BadRequestException('This item is in stock right now');
    }
    if (product.status !== 'ACTIVE' && product.status !== 'OUT_OF_STOCK') {
      throw new BadRequestException(
        'This product is not for sale at the moment',
      );
    }

    const key = variantId ?? '';
    const existing = await this.prisma.backInStockSubscription.findUnique({
      where: {
        email_productId_variantKey: {
          email,
          productId: product.id,
          variantKey: key,
        },
      },
    });
    if (existing && !existing.notified) {
      return {
        subscribed: true,
        alreadySubscribed: true,
        cancelToken: existing.cancelToken,
      };
    }

    const waiting = await this.prisma.backInStockSubscription.count({
      where: { email, notified: false },
    });
    if (waiting >= MAX_WAITING_PER_EMAIL) {
      throw new BadRequestException(
        `You can wait for at most ${MAX_WAITING_PER_EMAIL} items at once`,
      );
    }

    const sub = existing
      ? await this.prisma.backInStockSubscription.update({
          where: { id: existing.id },
          data: {
            notified: false,
            notifiedAt: null,
            attempts: 0,
            lastError: null,
            userId: user?.id ?? existing.userId,
          },
        })
      : await this.prisma.backInStockSubscription
          .create({
            data: {
              email,
              productId: product.id,
              variantId,
              variantKey: key,
              userId: user?.id ?? null,
            },
          })
          // two identical requests at the same moment: the second one just finds the first
          .catch(async () =>
            this.prisma.backInStockSubscription.findUniqueOrThrow({
              where: {
                email_productId_variantKey: {
                  email,
                  productId: product.id,
                  variantKey: key,
                },
              },
            }),
          );
    return {
      subscribed: true,
      alreadySubscribed: false,
      cancelToken: sub.cancelToken,
    };
  }

  // Works from the link in the email, without logging in.
  async cancelByToken(token: string) {
    const r = await this.prisma.backInStockSubscription.deleteMany({
      where: { cancelToken: token },
    });
    if (r.count === 0)
      throw new NotFoundException(
        'This alert was not found (it may already be cancelled)',
      );
    return { cancelled: true };
  }

  async mine(user: User) {
    const rows = await this.prisma.backInStockSubscription.findMany({
      where: {
        OR: [{ userId: user.id }, { email: user.email.toLowerCase() }],
        notified: false,
      },
      orderBy: { createdAt: 'desc' },
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
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      variantId: r.variantId,
      product: {
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        image: r.product.images[0]?.url ?? null,
      },
      createdAt: r.createdAt,
    }));
  }

  async cancelMine(user: User, id: string) {
    const r = await this.prisma.backInStockSubscription.deleteMany({
      where: {
        id,
        OR: [{ userId: user.id }, { email: user.email.toLowerCase() }],
      },
    });
    if (r.count === 0) throw new NotFoundException('Alert not found');
    return { cancelled: true };
  }
}
