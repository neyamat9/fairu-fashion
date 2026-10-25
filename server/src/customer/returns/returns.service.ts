import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminFeedService } from '../../common/admin-feed';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../common/settings';
import { round2 } from '../shipping/shipping.service';
import { CreateReturnDto } from './dto/create-return.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

const returnInclude = {
  order: { select: { id: true, orderNumber: true, deliveredAt: true } },
  items: {
    include: {
      orderItem: {
        select: {
          id: true,
          productName: true,
          productSlug: true,
          productImage: true,
          variantName: true,
          price: true,
          quantity: true,
        },
      },
    },
  },
} satisfies Prisma.ReturnRequestInclude;

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private adminFeed: AdminFeedService,
  ) {}

  // What can still be returned from an order, and why not if nothing can.
  async getEligibility(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const policy = await this.settings.get('returns');
    const returnDeadline = order.deliveredAt
      ? new Date(order.deliveredAt.getTime() + policy.returnWindowDays * DAY_MS)
      : null;

    let reason: string | null = null;
    if (!policy.returnsEnabled) {
      reason = 'Returns are currently not accepted';
    } else if (order.status !== 'DELIVERED' || !order.deliveredAt) {
      reason = 'Only delivered orders can be returned';
    } else if (returnDeadline && returnDeadline < new Date()) {
      reason = `The ${policy.returnWindowDays}-day return window for this order has ended`;
    }

    const alreadyRequested = await this.requestedQuantities(order.id);
    const items = order.items.map((item) => {
      const returnableQuantity = Math.max(
        0,
        item.quantity - (alreadyRequested.get(item.id) ?? 0),
      );
      return {
        orderItemId: item.id,
        productName: item.productName,
        productSlug: item.productSlug,
        productImage: item.productImage,
        variantName: item.variantName,
        price: Number(item.price),
        orderedQuantity: item.quantity,
        returnableQuantity,
      };
    });

    if (!reason && items.every((i) => i.returnableQuantity === 0)) {
      reason = 'All items in this order already have a return request';
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      eligible: reason === null,
      reason,
      returnWindowDays: policy.returnWindowDays,
      returnDeadline,
      items,
    };
  }

  async create(userId: string, dto: CreateReturnDto) {
    const eligibility = await this.getEligibility(userId, dto.orderId);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    const ids = dto.items.map((i) => i.orderItemId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Each order item can only be listed once');
    }

    const byId = new Map(eligibility.items.map((i) => [i.orderItemId, i]));
    const items = dto.items.map((reqItem) => {
      const item = byId.get(reqItem.orderItemId);
      if (!item) {
        throw new BadRequestException(
          'One of the items does not belong to this order',
        );
      }
      if (reqItem.quantity > item.returnableQuantity) {
        throw new BadRequestException(
          `You can return at most ${item.returnableQuantity} of "${item.productName}"`,
        );
      }
      return {
        orderItemId: item.orderItemId,
        quantity: reqItem.quantity,
        condition: reqItem.condition ?? null,
        refundAmount: round2(item.price * reqItem.quantity),
      };
    });

    const created = await this.prisma.returnRequest.create({
      data: {
        userId,
        orderId: dto.orderId,
        reason: dto.reason,
        detail: dto.detail ?? null,
        pickupAddress: dto.pickupAddress ?? null,
        items: { create: items },
      },
      include: returnInclude,
    });
    void this.adminFeed.notify({
      type: 'RETURN_REQUESTED',
      title: 'New return request',
      body: `${created.items.length} item(s) · ${dto.reason}`,
      entityType: 'return',
      entityId: created.id,
      data: { orderId: dto.orderId },
    });
    return created;
  }

  async findAll(userId: string) {
    const requests = await this.prisma.returnRequest.findMany({
      where: { userId },
      include: returnInclude,
      orderBy: { createdAt: 'desc' },
    });
    return requests.map(withTotal);
  }

  async findOne(userId: string, id: string) {
    const request = await this.prisma.returnRequest.findFirst({
      where: { id, userId },
      include: returnInclude,
    });
    if (!request) throw new NotFoundException('Return request not found');
    return withTotal(request);
  }

  // A customer can withdraw a request until the store has acted on it.
  async cancel(userId: string, id: string) {
    const request = await this.prisma.returnRequest.findFirst({
      where: { id, userId },
    });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== 'REQUESTED') {
      throw new BadRequestException(
        `This return is already ${request.status.toLowerCase()} and can no longer be cancelled`,
      );
    }
    await this.prisma.returnRequest.delete({ where: { id } });
    return { success: true, message: 'Return request cancelled' };
  }

  // Quantities already covered by non-rejected return requests, per order item.
  private async requestedQuantities(orderId: string) {
    const rows = await this.prisma.returnItem.groupBy({
      by: ['orderItemId'],
      where: { returnRequest: { orderId, status: { not: 'REJECTED' } } },
      _sum: { quantity: true },
    });
    return new Map(rows.map((r) => [r.orderItemId, r._sum.quantity ?? 0]));
  }
}

function withTotal<T extends { items: { refundAmount: Prisma.Decimal }[] }>(
  request: T,
) {
  return {
    ...request,
    totalRefundAmount: round2(
      request.items.reduce((s, i) => s + Number(i.refundAmount), 0),
    ),
  };
}
