import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type FlashDealInput = Omit<Prisma.FlashDealCreateInput, 'products'> & {
  productIds?: string[];
};

@Injectable()
export class AdminFlashDealsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.flashDeal.findMany({
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, sellingPrice: true },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const deal = await this.prisma.flashDeal.findUnique({
      where: { id },
      include: { products: { include: { product: true } } },
    });
    if (!deal) throw new NotFoundException('Flash deal not found');
    return deal;
  }

  async create(data: FlashDealInput) {
    const { productIds, ...dealData } = data;
    return this.prisma.flashDeal.create({
      data: {
        ...dealData,
        products: productIds
          ? {
              create: productIds.map((pid: string) => ({
                productId: pid,
                dealPrice: 0,
              })),
            }
          : undefined,
      },
      include: { products: true },
    });
  }

  async update(id: string, data: FlashDealInput) {
    const deal = await this.prisma.flashDeal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Flash deal not found');
    const { productIds: _ignored, ...dealData } = data;
    void _ignored;
    return this.prisma.flashDeal.update({
      where: { id },
      data: dealData,
      include: { products: true },
    });
  }

  async remove(id: string) {
    const deal = await this.prisma.flashDeal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException('Flash deal not found');
    await this.prisma.flashDeal.delete({ where: { id } });
    return { success: true };
  }
}
