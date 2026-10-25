import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Coupon, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { writeAudit } from '../../common/audit';
import { Table } from '../../common/export/table-export';
import {
  BulkGenerateCouponsDto,
  CreateCouponDto,
  ListCouponsDto,
  UpdateCouponDto,
  UsageQueryDto,
} from './dto/coupon.dto';

// No 0/O/1/I/L: codes get read out over the phone
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const round2 = (n: number) => Math.round(n * 100) / 100;

export function couponState(
  c: Pick<
    Coupon,
    'isActive' | 'validFrom' | 'validTo' | 'maxUsageCount' | 'usageCount'
  >,
  now = new Date(),
) {
  if (!c.isActive) return 'inactive' as const;
  if (c.validTo < now) return 'expired' as const;
  if (c.validFrom > now) return 'scheduled' as const;
  if (c.maxUsageCount !== null && c.usageCount >= c.maxUsageCount)
    return 'used-up' as const;
  return 'active' as const;
}

@Injectable()
export class AdminCouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q: ListCouponsDto) {
    const now = new Date();
    const and: Prisma.CouponWhereInput[] = [];
    if (q.search) {
      const m = { contains: q.search, mode: 'insensitive' as const };
      and.push({ OR: [{ code: m }, { description: m }] });
    }
    switch (q.state) {
      case 'inactive':
        and.push({ isActive: false });
        break;
      case 'expired':
        and.push({ isActive: true, validTo: { lt: now } });
        break;
      case 'scheduled':
        and.push({ isActive: true, validFrom: { gt: now } });
        break;
      case 'used-up':
        and.push({
          isActive: true,
          validTo: { gte: now },
          validFrom: { lte: now },
          maxUsageCount: {
            not: null,
            lte: this.prisma.coupon.fields.usageCount,
          },
        });
        break;
      case 'active':
        and.push({
          isActive: true,
          validFrom: { lte: now },
          validTo: { gte: now },
          OR: [
            { maxUsageCount: null },
            { maxUsageCount: { gt: this.prisma.coupon.fields.usageCount } },
          ],
        });
        break;
    }
    const where: Prisma.CouponWhereInput = and.length ? { AND: and } : {};
    const [rows, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return {
      data: rows.map((c) => ({ ...c, state: couponState(c, now) })),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { usedAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return {
      ...coupon,
      state: couponState(coupon),
      note: 'Only the 20 latest uses are listed here; see /usage for all of them.',
    };
  }

  async create(dto: CreateCouponDto, adminId: string) {
    const data = this.toData(dto);
    this.assertConsistent({ ...data } as Partial<Coupon>);
    await this.assertCodeFree(data.code as string);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({
        data: { ...(data as Prisma.CouponCreateInput), createdBy: adminId },
      });
      await writeAudit(tx, {
        adminId,
        action: 'COUPON_CREATED',
        entity: 'Coupon',
        entityId: created.id,
        newValue: {
          code: created.code,
          discountType: created.discountType,
          discountValue: Number(created.discountValue),
          validFrom: created.validFrom,
          validTo: created.validTo,
        },
      });
      return created;
    });
  }

  async update(id: string, dto: UpdateCouponDto, adminId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    const data = this.toData(dto);
    this.assertConsistent({ ...coupon, ...data } as Partial<Coupon>);
    if (data.code && data.code !== coupon.code) {
      await this.assertCodeFree(data.code as string);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.coupon.update({ where: { id }, data });
      const plain = (row: object) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            v !== null && typeof v === 'object' && 'toFixed' in v
              ? Number(v)
              : v,
          ]),
        );
      const before = plain(coupon);
      const after = plain(updated);
      const oldValue: Record<string, unknown> = { code: coupon.code };
      const newValue: Record<string, unknown> = { code: updated.code };
      for (const k of Object.keys(data)) {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
          oldValue[k] = before[k];
          newValue[k] = after[k];
        }
      }
      if (Object.keys(newValue).length > 1) {
        await writeAudit(tx, {
          adminId,
          action: 'COUPON_UPDATED',
          entity: 'Coupon',
          entityId: id,
          oldValue,
          newValue,
        });
      }
      return updated;
    });
  }

  private toData(dto: UpdateCouponDto): Prisma.CouponUpdateInput {
    const {
      applicableCategories,
      applicableProducts,
      applicableUsers,
      ...rest
    } = dto;
    const toJson = (v?: string[] | null) =>
      v === undefined
        ? undefined
        : v === null || v.length === 0
          ? null
          : JSON.stringify(v);

    const data: Prisma.CouponUpdateInput = {
      ...rest,
      ...(rest.code !== undefined
        ? { code: rest.code.trim().toUpperCase() }
        : {}),
      applicableCategories: toJson(applicableCategories),
      applicableProducts: toJson(applicableProducts),
      applicableUsers: toJson(applicableUsers),
    };
    // Fields that were not sent are undefined; drop them so they do not
    // mask the stored values when checking consistency on update.
    return Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Prisma.CouponUpdateInput;
  }

  private assertConsistent(c: Partial<Coupon>) {
    const value = Number(c.discountValue ?? 0);
    if (c.discountType === 'BUY_X_GET_Y') {
      throw new BadRequestException(
        'BUY_X_GET_Y coupons are not supported at checkout',
      );
    }
    if (
      (c.discountType ?? 'PERCENTAGE') === 'PERCENTAGE' &&
      (value <= 0 || value > 100)
    ) {
      throw new BadRequestException(
        'Percentage discount must be between 1 and 100',
      );
    }
    if (c.discountType === 'FIXED_AMOUNT' && value <= 0) {
      throw new BadRequestException('Fixed discount must be greater than 0');
    }
    if (
      c.validFrom &&
      c.validTo &&
      new Date(c.validFrom) >= new Date(c.validTo)
    ) {
      throw new BadRequestException('validFrom must be before validTo');
    }
  }

  private async assertCodeFree(code: string) {
    const existing = await this.prisma.coupon.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
    });
    if (existing)
      throw new ConflictException(`Coupon code "${code}" already exists`);
  }

  async remove(id: string, adminId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { usages: true } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon._count.usages > 0) {
      throw new ConflictException(
        'This coupon has been used on orders, so it cannot be deleted. Switch it off (isActive: false) instead.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.delete({ where: { id } });
      await writeAudit(tx, {
        adminId,
        action: 'COUPON_DELETED',
        entity: 'Coupon',
        entityId: id,
        oldValue: { code: coupon.code },
      });
    });
    return { success: true };
  }

  // ---------- usage reports ----------

  private async usageSummary(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    const [agg, customers, revenue] = await Promise.all([
      this.prisma.couponUsage.aggregate({
        where: { couponId: id },
        _count: true,
        _sum: { discountAmount: true },
      }),
      this.prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT COALESCE("userId", "guestPhone"))::int AS n
        FROM "CouponUsage" WHERE "couponId" = ${id}`),
      this.prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM(o.total), 0)::float8 AS total
        FROM "CouponUsage" cu JOIN "Order" o ON o.id = cu."orderId"
        WHERE cu."couponId" = ${id}`),
    ]);
    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        state: couponState(coupon),
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        validFrom: coupon.validFrom,
        validTo: coupon.validTo,
        maxUsageCount: coupon.maxUsageCount,
        maxUsagePerUser: coupon.maxUsagePerUser,
      },
      summary: {
        uses: agg._count,
        remainingUses:
          coupon.maxUsageCount === null
            ? null
            : Math.max(0, coupon.maxUsageCount - coupon.usageCount),
        totalDiscountGiven: round2(Number(agg._sum.discountAmount ?? 0)),
        uniqueCustomers: customers[0]?.n ?? 0,
        orderRevenue: round2(revenue[0]?.total ?? 0),
      },
    };
  }

  // Every use of the coupon: who, which order, how much it saved.
  async usageReport(id: string, q: UsageQueryDto) {
    const head = await this.usageSummary(id);
    const where = { couponId: id };
    const [rows, total] = await Promise.all([
      this.prisma.couponUsage.findMany({
        where,
        orderBy: [{ usedAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.couponUsage.count({ where }),
    ]);
    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: rows.map((r) => r.orderId).filter((x): x is string => !!x) },
      },
      select: { id: true, orderNumber: true, total: true, status: true },
    });
    const byOrder = new Map(orders.map((o) => [o.id, o]));
    return {
      ...head,
      data: rows.map((r) => ({
        id: r.id,
        usedAt: r.usedAt,
        customer:
          r.user ?? (r.guestPhone ? { guestPhone: r.guestPhone } : null),
        order: r.orderId ? (byOrder.get(r.orderId) ?? { id: r.orderId }) : null,
        discountAmount: Number(r.discountAmount),
      })),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  // Per customer: how often each one used the coupon.
  async usersReport(id: string, q: UsageQueryDto) {
    const head = await this.usageSummary(id);
    const key = Prisma.sql`COALESCE(cu."userId", 'guest:' || cu."guestPhone")`;
    const [rows, count] = await Promise.all([
      this.prisma.$queryRaw<
        {
          who: string;
          userId: string | null;
          guestPhone: string | null;
          uses: number;
          discount: number;
          lastUsedAt: Date;
        }[]
      >(Prisma.sql`
        SELECT ${key} AS who, MAX(cu."userId") AS "userId", MAX(cu."guestPhone") AS "guestPhone",
               COUNT(*)::int AS uses, SUM(cu."discountAmount")::float8 AS discount,
               MAX(cu."usedAt") AS "lastUsedAt"
        FROM "CouponUsage" cu WHERE cu."couponId" = ${id}
        GROUP BY ${key} ORDER BY uses DESC, "lastUsedAt" DESC
        LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`),
      this.prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT ${key})::int AS n FROM "CouponUsage" cu WHERE cu."couponId" = ${id}`),
    ]);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: rows.map((r) => r.userId).filter((x): x is string => !!x) },
      },
      select: { id: true, name: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const total = count[0]?.n ?? 0;
    return {
      ...head,
      data: rows.map((r) => ({
        customer: r.userId
          ? (byId.get(r.userId) ?? { id: r.userId })
          : { guestPhone: r.guestPhone },
        uses: r.uses,
        totalDiscount: round2(r.discount),
        lastUsedAt: r.lastUsedAt,
      })),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async usageTable(id: string): Promise<Table> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      select: { code: true },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    const rows = await this.prisma.couponUsage.findMany({
      where: { couponId: id },
      orderBy: [{ usedAt: 'desc' }, { id: 'asc' }],
      take: 50001,
      include: { user: { select: { name: true, email: true } } },
    });
    if (rows.length > 50000)
      throw new BadRequestException('Too many rows to export');
    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: rows.map((r) => r.orderId).filter((x): x is string => !!x) },
      },
      select: { id: true, orderNumber: true, total: true },
    });
    const byOrder = new Map(orders.map((o) => [o.id, o]));
    const out = rows.map((r) => ({
      usedAt: r.usedAt,
      customer: r.user?.name ?? 'Guest',
      email: r.user?.email ?? null,
      phone: r.guestPhone,
      order: r.orderId ? (byOrder.get(r.orderId)?.orderNumber ?? null) : null,
      orderTotal: r.orderId ? Number(byOrder.get(r.orderId)?.total ?? 0) : null,
      discount: Number(r.discountAmount),
    }));
    return {
      title: 'Coupon usage',
      filename: `coupon-${coupon.code}-usage`,
      meta: { Coupon: coupon.code },
      columns: [
        { key: 'usedAt', header: 'Used at', type: 'date' },
        { key: 'customer', header: 'Customer' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Guest phone' },
        { key: 'order', header: 'Order' },
        { key: 'orderTotal', header: 'Order total', type: 'money' },
        { key: 'discount', header: 'Discount', type: 'money' },
      ],
      rows: out,
      totals: {
        usedAt: 'Total',
        discount: round2(out.reduce((s, x) => s + x.discount, 0)),
      },
    };
  }

  // ---------- bulk generation ----------

  async bulkGenerate(dto: BulkGenerateCouponsDto, adminId: string) {
    const { count, prefix, codeLength, format, ...rest } = dto;
    void format;
    const base = this.toData(rest as UpdateCouponDto) as Record<
      string,
      unknown
    >;
    this.assertConsistent({ ...base } as Partial<Coupon>);
    const description =
      dto.description ??
      `Bulk batch of ${count} on ${new Date().toISOString().slice(0, 10)}`;

    const made: string[] = [];
    // Collisions are very unlikely but possible; keep topping up.
    for (let round = 0; round < 6 && made.length < count; round++) {
      const need = count - made.length;
      const batch = new Set<string>();
      while (batch.size < need) {
        let random = '';
        for (let i = 0; i < codeLength; i++)
          random += CODE_CHARS[randomInt(CODE_CHARS.length)];
        const code = prefix ? `${prefix}-${random}` : random;
        if (!made.includes(code)) batch.add(code);
      }
      const result = await this.prisma.coupon.createManyAndReturn({
        data: [...batch].map((code) => ({
          ...(base as Prisma.CouponCreateManyInput),
          code,
          description,
          createdBy: adminId,
        })),
        skipDuplicates: true,
        select: { code: true },
      });
      made.push(...result.map((r) => r.code));
    }
    if (made.length < count) {
      throw new ConflictException(
        `Only ${made.length} of ${count} unique codes could be made. Use a longer code or another prefix.`,
      );
    }
    await writeAudit(this.prisma, {
      adminId,
      action: 'COUPON_CREATED',
      entity: 'Coupon',
      newValue: {
        bulk: count,
        prefix: prefix ?? null,
        discountType: base.discountType ?? 'PERCENTAGE',
        discountValue: base.discountValue,
        validTo: base.validTo,
      },
    });
    return { count: made.length, codes: made.sort(), description };
  }
}
