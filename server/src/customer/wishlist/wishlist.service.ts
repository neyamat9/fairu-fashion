import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            sellingPrice: true,
            regularPrice: true,
            stock: true,
            images: { where: { isMain: true }, take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      slug: item.product.slug,
      name: item.product.name,
      price: Number(item.product.sellingPrice),
      originalPrice: Number(item.product.regularPrice),
      imageUrl: item.product.images[0]?.url ?? null,
      stock: item.product.stock,
      addedAt: item.addedAt,
    }));
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId, status: 'ACTIVE' },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new ConflictException('Already in wishlist');

    return this.prisma.wishlistItem.create({
      data: { userId, productId },
    });
  }

  async remove(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundException('Item not in wishlist');

    await this.prisma.wishlistItem.delete({ where: { id: item.id } });
    return { success: true };
  }

  async isInWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { inWishlist: !!item };
  }
}
