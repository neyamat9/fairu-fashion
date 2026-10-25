import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AdminFeedService } from '../../common/admin-feed';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../../common/uploads';
import { CreateReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import { AskQuestionDto } from './dto/ask-question.dto';

const reviewImages = {
  uploads: {
    orderBy: { position: 'asc' as const },
    select: { id: true, key: true, width: true, height: true },
  },
} satisfies Prisma.ReviewInclude;

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private adminFeed: AdminFeedService,
  ) {}

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const where = { productId, status: 'APPROVED' as const };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          helpfulVotes: true,
          ...reviewImages,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const ratingBreakdown = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId, status: 'APPROVED' },
      _count: true,
    });

    const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingBreakdown.forEach((r) => {
      breakdown[r.rating] = r._count;
    });

    const avgAgg = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
    });

    const reviews = data.map((r) => ({
      id: r.id,
      productId: r.productId,
      reviewerName: r.user.name,
      avatarUrl: r.user.avatarUrl,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      date: r.createdAt,
      helpfulCount: r.helpfulVotes.filter((v) => v.isHelpful).length,
      notHelpfulCount: r.helpfulVotes.filter((v) => !v.isHelpful).length,
      verified: r.isVerified,
      images: r.uploads.map((u) => this.uploads.view(u)),
    }));

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        averageRating: Number(avgAgg._avg.rating?.toFixed(1) ?? 0),
        totalReviews: total,
        ratingBreakdown: breakdown,
      },
    };
  }

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId: dto.productId } },
    });
    if (existing) {
      throw new ConflictException('You already reviewed this product');
    }

    // "Verified purchase" only counts orders that were really delivered.
    const hasOrdered = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { userId, status: 'DELIVERED' },
      },
      select: { orderId: true },
    });

    let reviewId: string;
    try {
      reviewId = await this.prisma.$transaction(async (tx) => {
        const photos = await this.uploads.resolveOwned(
          tx,
          userId,
          'REVIEW_IMAGE',
          dto.imageIds ?? [],
        );
        const review = await tx.review.create({
          data: {
            userId,
            productId: dto.productId,
            rating: dto.rating,
            title: dto.title || null,
            comment: dto.comment,
            isVerified: !!hasOrdered,
            orderId: hasOrdered?.orderId ?? null,
            status: 'APPROVED',
          },
        });
        await this.attach(tx, review.id, photos);
        return review.id;
      });
    } catch (error) {
      // Two requests raced past the check above.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('You already reviewed this product');
      }
      throw error;
    }

    await this.updateProductRating(dto.productId);
    return this.findMine(userId, reviewId);
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
      include: reviewImages,
    });
    if (!review) throw new NotFoundException('Review not found');

    if (
      dto.rating === undefined &&
      dto.title === undefined &&
      dto.comment === undefined &&
      dto.imageIds === undefined
    ) {
      throw new BadRequestException('Nothing to update');
    }

    const removedKeys = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ReviewUpdateInput = {};
      if (dto.rating !== undefined) data.rating = dto.rating;
      if (dto.title !== undefined) data.title = dto.title || null;
      if (dto.comment !== undefined) data.comment = dto.comment;
      if (Object.keys(data).length) {
        await tx.review.update({ where: { id: reviewId }, data });
      }

      let removed: string[] = [];
      if (dto.imageIds !== undefined) {
        const photos = await this.uploads.resolveOwned(
          tx,
          userId,
          'REVIEW_IMAGE',
          dto.imageIds,
          reviewId,
        );
        const keep = new Set(photos.map((p) => p.id));
        const drop = review.uploads.filter((u) => !keep.has(u.id));
        if (drop.length) {
          await tx.upload.deleteMany({
            where: { id: { in: drop.map((d) => d.id) } },
          });
          removed = drop.map((d) => d.key);
        }
        await this.attach(tx, reviewId, photos);
      }
      return removed;
    });

    if (removedKeys.length) await this.uploads.removeFiles(removedKeys);
    if (dto.rating !== undefined)
      await this.updateProductRating(review.productId);
    return this.findMine(userId, reviewId);
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
      include: reviewImages,
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.upload.deleteMany({ where: { reviewId } });
      await tx.review.delete({ where: { id: reviewId } });
    });

    await this.uploads.removeFiles(review.uploads.map((u) => u.key));
    await this.updateProductRating(review.productId);
    return { success: true };
  }

  // The customer's own reviews, newest first, with the product and status.
  async listMine(userId: string, page = 1, limit = 10) {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          ...reviewImages,
          helpfulVotes: { select: { isHelpful: true } },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                where: { isMain: true },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: rows.map((r) => this.toMine(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMine(userId: string, reviewId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
      include: {
        ...reviewImages,
        helpfulVotes: { select: { isHelpful: true } },
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
    if (!review) throw new NotFoundException('Review not found');
    return this.toMine(review);
  }

  private toMine(
    r: Prisma.ReviewGetPayload<{
      include: typeof reviewImages & {
        helpfulVotes: { select: { isHelpful: true } };
        product: {
          select: {
            id: true;
            name: true;
            slug: true;
            images: { select: { url: true } };
          };
        };
      };
    }>,
  ) {
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status,
      verified: r.isVerified,
      helpfulCount: r.helpfulVotes.filter((v) => v.isHelpful).length,
      notHelpfulCount: r.helpfulVotes.filter((v) => !v.isHelpful).length,
      images: r.uploads.map((u) => this.uploads.view(u)),
      product: {
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        image: r.product.images[0]?.url ?? null,
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  // Links uploads to a review in the given order.
  private async attach(
    tx: Prisma.TransactionClient,
    reviewId: string,
    photos: { id: string }[],
  ) {
    const now = new Date();
    for (const [position, photo] of photos.entries()) {
      await tx.upload.update({
        where: { id: photo.id },
        data: { reviewId, position, attachedAt: now },
      });
    }
  }

  async voteHelpful(userId: string, reviewId: string, isHelpful: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const existing = await this.prisma.reviewHelpfulVote.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });

    if (existing) {
      return this.prisma.reviewHelpfulVote.update({
        where: { id: existing.id },
        data: { isHelpful },
      });
    }

    return this.prisma.reviewHelpfulVote.create({
      data: { userId, reviewId, isHelpful },
    });
  }

  async getProductQuestions(productId: string) {
    return this.prisma.productQuestion.findMany({
      where: { productId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async askQuestion(userId: string, dto: AskQuestionDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const created = await this.prisma.productQuestion.create({
      data: {
        userId,
        productId: dto.productId,
        question: dto.question,
      },
    });
    void this.adminFeed.notify({
      type: 'QUESTION_ASKED',
      title: `New question about ${product.name}`,
      body: dto.question,
      entityType: 'question',
      entityId: created.id,
      data: { productId: product.id },
    });
    return created;
  }

  private async updateProductRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });
  }
}
