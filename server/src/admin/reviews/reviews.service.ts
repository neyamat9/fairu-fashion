import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { UploadsService } from '../../common/uploads';
import { NotificationsService } from '../../common/notifications';
import {
  AnswerQuestionDto,
  ListQuestionsDto,
  ListReviewsDto,
} from './reviews.dto';

const reviewInclude = {
  user: { select: { id: true, name: true, email: true } },
  product: { select: { id: true, name: true, slug: true } },
  uploads: { select: { id: true, key: true } },
} satisfies Prisma.ReviewInclude;

@Injectable()
export class AdminReviewsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private uploads: UploadsService,
    private notifications: NotificationsService,
  ) {}

  // ---------- reviews ----------

  async list(q: ListReviewsDto) {
    const where: Prisma.ReviewWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.rating ? { rating: q.rating } : {}),
      ...(q.productId ? { productId: q.productId } : {}),
      ...(q.userId ? { userId: q.userId } : {}),
    };
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      where.OR = [
        { comment: s },
        { title: s },
        { user: { name: s } },
        { user: { email: s } },
        { product: { name: s } },
      ];
    }
    const [rows, total, counts] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    return {
      data: rows.map((r) => this.view(r)),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
      statusCounts: Object.fromEntries(
        counts.map((c) => [c.status, c._count._all]),
      ),
    };
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: reviewInclude,
    });
    if (!review) throw new NotFoundException('Review not found');
    return this.view(review);
  }

  async setStatus(id: string, status: ReviewStatus) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.review.update({ where: { id }, data: { status } });
    await this.recalculate(review.productId);
    return this.findOne(id);
  }

  async bulkStatus(ids: string[], status: ReviewStatus) {
    const unique = [...new Set(ids)];
    if (!unique.length || unique.length > 200) {
      throw new BadRequestException('Send between 1 and 200 review ids');
    }
    const reviews = await this.prisma.review.findMany({
      where: { id: { in: unique } },
      select: { id: true, productId: true },
    });
    await this.prisma.review.updateMany({
      where: { id: { in: reviews.map((r) => r.id) } },
      data: { status },
    });
    for (const productId of new Set(reviews.map((r) => r.productId))) {
      await this.recalculate(productId);
    }
    return {
      updated: reviews.length,
      notFound: unique.filter((id) => !reviews.some((r) => r.id === id)),
    };
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: reviewInclude,
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.upload.deleteMany({ where: { reviewId: id } });
      await tx.review.delete({ where: { id } });
    });
    await this.uploads.removeFiles(review.uploads.map((u) => u.key));
    await this.recalculate(review.productId);
    return { success: true };
  }

  async stats() {
    const [byStatus, byRating, awaiting] = await Promise.all([
      this.prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { status: 'APPROVED' },
        _count: { _all: true },
      }),
      this.prisma.productQuestion.count({ where: { answer: null } }),
    ]);
    return {
      byStatus: Object.fromEntries(
        byStatus.map((s) => [s.status, s._count._all]),
      ),
      approvedByRating: Object.fromEntries(
        byRating.map((s) => [s.rating, s._count._all]),
      ),
      questionsAwaitingAnswer: awaiting,
    };
  }

  // ---------- questions ----------

  async listQuestions(q: ListQuestionsDto) {
    const where: Prisma.ProductQuestionWhereInput = {
      ...(q.answered === undefined
        ? {}
        : q.answered
          ? { answer: { not: null } }
          : { answer: null }),
      ...(q.productId ? { productId: q.productId } : {}),
    };
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      where.OR = [
        { question: s },
        { answer: s },
        { product: { name: s } },
        { user: { name: s } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.productQuestion.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        // unanswered first, oldest first (longest waiting)
        orderBy:
          q.answered === undefined
            ? [{ createdAt: 'desc' }]
            : [{ createdAt: q.answered ? 'desc' : 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.productQuestion.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  // Answers (or edits the answer of) a question and tells the customer.
  async answer(id: string, dto: AnswerQuestionDto) {
    const question = await this.prisma.productQuestion.findUnique({
      where: { id },
      include: { product: { select: { name: true, slug: true } } },
    });
    if (!question) throw new NotFoundException('Question not found');
    const first = question.answer === null;

    const updated = await this.prisma.productQuestion.update({
      where: { id },
      data: {
        answer: dto.answer,
        answeredByAdmin: true,
        answeredAt: first ? new Date() : question.answeredAt,
      },
    });
    this.cache.delByPrefix('products:');

    if (first) {
      void this.notifications
        .notifyInApp(question.userId, {
          type: 'QUESTION_ANSWERED',
          title: `Your question about ${question.product.name} was answered`,
          body:
            dto.answer.length > 300
              ? `${dto.answer.slice(0, 297)}...`
              : dto.answer,
          data: {
            questionId: id,
            productId: question.productId,
            productSlug: question.product.slug,
          },
        })
        .catch(() => undefined);
    }
    return updated;
  }

  async removeQuestion(id: string) {
    const found = await this.prisma.productQuestion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Question not found');
    await this.prisma.productQuestion.delete({ where: { id } });
    this.cache.delByPrefix('products:');
    return { success: true };
  }

  // ---------- helpers ----------

  private view(r: Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>) {
    const { uploads, images, ...rest } = r;
    let urls: string[] = [];
    try {
      const parsed: unknown = images ? JSON.parse(images) : [];
      if (Array.isArray(parsed)) urls = parsed.map(String);
    } catch {
      /* ignore broken legacy value */
    }
    return {
      ...rest,
      images: [...uploads.map((u) => this.uploads.url(u.key)), ...urls],
    };
  }

  // Only approved reviews count towards the product's rating.
  private async recalculate(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
    this.cache.delByPrefix('products:');
  }
}
