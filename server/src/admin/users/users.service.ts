import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { writeAudit } from '../../common/audit';
import { Table } from '../../common/export/table-export';
import {
  ExportUsersDto,
  ListUsersDto,
  PageDto,
  UserFilterDto,
} from './dto/users-admin.dto';

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];
const round2 = (n: number) => Math.round(n * 100) / 100;
const VALID_ORDER: Prisma.OrderWhereInput = {
  status: { notIn: ['CANCELLED', 'REFUNDED'] },
};
const EXPORT_MAX = 50000;

const dayStart = (d: string) => new Date(`${d}T00:00:00+06:00`);
const dayEnd = (d: string) =>
  new Date(dayStart(d).getTime() + 24 * 60 * 60 * 1000);

const SORTS: Record<string, Prisma.UserOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  name: { name: 'asc' },
  spent: { totalSpent: 'desc' },
  orders: { totalOrders: 'desc' },
  'last-login': { lastLoginAt: { sort: 'desc', nulls: 'last' } },
};

const listSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  emailVerified: true,
  avatarUrl: true,
  totalOrders: true,
  totalSpent: true,
  createdAt: true,
  lastLoginAt: true,
  _count: { select: { orders: true, reviews: true } },
} satisfies Prisma.UserSelect;

// Order copies of addresses belong to the order, not the address book.
const ADDRESS_BOOK: Prisma.AddressWhereInput = {
  shippingOrders: { none: {} },
  billingOrders: { none: {} },
};

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  private where(q: UserFilterDto): Prisma.UserWhereInput {
    const and: Prisma.UserWhereInput[] = [{ role: q.role ?? 'USER' }];
    if (q.status) and.push({ status: q.status });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({
        OR: [{ name: s }, { email: s }, { phone: { contains: q.search } }],
      });
    }
    if (q.registeredFrom || q.registeredTo) {
      and.push({
        createdAt: {
          ...(q.registeredFrom ? { gte: dayStart(q.registeredFrom) } : {}),
          ...(q.registeredTo ? { lt: dayEnd(q.registeredTo) } : {}),
        },
      });
    }
    if (q.hasOrdered === true) and.push({ orders: { some: VALID_ORDER } });
    if (q.hasOrdered === false) and.push({ orders: { none: VALID_ORDER } });
    return { AND: and };
  }

  async findAll(q: ListUsersDto) {
    const where = this.where(q);
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: listSelect,
        orderBy: [SORTS[q.sortBy ?? 'newest'], { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.user.count({ where }),
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

  private async mustExist(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Customer not found');
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        avatarUrl: true,
        bio: true,
        occupation: true,
        dateOfBirth: true,
        gender: true,
        language: true,
        newsletter: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        loginCount: true,
      },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const [
      valid,
      cancelled,
      firstLast,
      returns,
      reviews,
      questions,
      tickets,
      openTickets,
      couponUses,
      notes,
      addresses,
      recentOrders,
      byStatus,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { userId: id, ...VALID_ORDER },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { userId: id, status: 'CANCELLED' } }),
      this.prisma.order.aggregate({
        where: { userId: id, ...VALID_ORDER },
        _min: { placedAt: true },
        _max: { placedAt: true },
      }),
      this.prisma.returnRequest.count({ where: { userId: id } }),
      this.prisma.review.count({ where: { userId: id } }),
      this.prisma.productQuestion.count({ where: { userId: id } }),
      this.prisma.supportTicket.count({ where: { submittedById: id } }),
      this.prisma.supportTicket.count({
        where: {
          submittedById: id,
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] },
        },
      }),
      this.prisma.couponUsage.count({ where: { userId: id } }),
      this.prisma.customerNote.count({ where: { userId: id } }),
      this.prisma.address.findMany({
        where: { userId: id, ...ADDRESS_BOOK },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { placedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          total: true,
          placedAt: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { userId: id },
        _count: true,
      }),
    ]);

    const lifetimeValue = Number(valid._sum.total ?? 0);
    return {
      ...user,
      stats: {
        lifetimeValue: round2(lifetimeValue),
        orders: valid._count,
        averageOrderValue: valid._count
          ? round2(lifetimeValue / valid._count)
          : 0,
        cancelledOrders: cancelled,
        firstOrderAt: firstLast._min.placedAt,
        lastOrderAt: firstLast._max.placedAt,
        returns,
        reviews,
        questions,
        tickets,
        openTickets,
        couponUses,
        notes,
        ordersByStatus: Object.fromEntries(
          byStatus.map((s) => [s.status, s._count]),
        ),
      },
      addresses,
      recentOrders,
    };
  }

  async orders(id: string, q: PageDto) {
    await this.mustExist(id);
    const where = { userId: id };
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          items: {
            select: {
              productName: true,
              variantName: true,
              quantity: true,
              price: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
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

  async addresses(id: string) {
    await this.mustExist(id);
    return this.prisma.address.findMany({
      where: { userId: id, ...ADDRESS_BOOK },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async tickets(id: string, q: PageDto) {
    await this.mustExist(id);
    const where = { submittedById: id };
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          category: true,
          priority: true,
          createdAt: true,
          lastMessageAt: true,
        },
      }),
      this.prisma.supportTicket.count({ where }),
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

  async reviews(id: string, q: PageDto) {
    await this.mustExist(id);
    const where = { userId: id };
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { product: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.review.count({ where }),
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

  async couponUsage(id: string, q: PageDto) {
    await this.mustExist(id);
    const where = { userId: id };
    const [data, total] = await Promise.all([
      this.prisma.couponUsage.findMany({
        where,
        orderBy: { usedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { coupon: { select: { id: true, code: true } } },
      }),
      this.prisma.couponUsage.count({ where }),
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

  // ---------- private notes ----------

  async notes(id: string) {
    await this.mustExist(id);
    return this.prisma.customerNote.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
  }

  async addNote(id: string, note: string, adminId: string) {
    await this.mustExist(id);
    const count = await this.prisma.customerNote.count({
      where: { userId: id },
    });
    if (count >= 200)
      throw new BadRequestException('A customer can have at most 200 notes');
    return this.prisma.customerNote.create({
      data: { userId: id, adminId, note },
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
  }

  async removeNote(id: string, noteId: string) {
    const r = await this.prisma.customerNote.deleteMany({
      where: { id: noteId, userId: id },
    });
    if (r.count === 0) throw new NotFoundException('Note not found');
    return { success: true };
  }

  // ---------- status / role ----------

  async updateStatus(id: string, status: UserStatus, actor: User) {
    if (id === actor.id)
      throw new BadRequestException(
        'You cannot change your own account status',
      );
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Customer not found');
    if (ADMIN_ROLES.includes(user.role) && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only a super admin can change an admin account',
      );
    }
    if (user.status === status)
      throw new BadRequestException(`The account is already ${status}`);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          status,
          // a blocked account is signed out everywhere (refresh token revoked)
          ...(status !== 'ACTIVE' ? { refreshTokenHash: null } : {}),
        },
        select: listSelect,
      });
      await writeAudit(tx, {
        adminId: actor.id,
        action: 'USER_STATUS_CHANGED',
        entity: 'User',
        entityId: id,
        oldValue: { email: user.email, status: user.status },
        newValue: { email: user.email, status },
      });
      return updated;
    });
  }

  async updateRole(id: string, role: Role, actor: User) {
    if (id === actor.id)
      throw new BadRequestException('You cannot change your own role');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Customer not found');
    if (user.role === role)
      throw new BadRequestException(`The account already has the role ${role}`);
    // Handing out or taking away admin rights is for the super admin only.
    if (
      (ADMIN_ROLES.includes(role) || ADMIN_ROLES.includes(user.role)) &&
      actor.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException(
        'Only a super admin can grant or remove admin access',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { role, refreshTokenHash: null },
        select: listSelect,
      });
      await writeAudit(tx, {
        adminId: actor.id,
        action: 'USER_ROLE_CHANGED',
        entity: 'User',
        entityId: id,
        oldValue: { email: user.email, role: user.role },
        newValue: { email: user.email, role },
      });
      return updated;
    });
  }

  // ---------- export ----------

  async exportTable(q: ExportUsersDto): Promise<Table> {
    const where = this.where(q);
    const users = await this.prisma.user.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: EXPORT_MAX + 1,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        emailVerified: true,
        newsletter: true,
        createdAt: true,
        lastLoginAt: true,
        loginCount: true,
      },
    });
    if (users.length > EXPORT_MAX) {
      throw new BadRequestException(
        `More than ${EXPORT_MAX} customers match. Add a filter.`,
      );
    }
    const ids = users.map((u) => u.id);
    const [agg, defaults] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { in: ids }, ...VALID_ORDER },
        _count: true,
        _sum: { total: true },
        _max: { placedAt: true },
      }),
      this.prisma.address.findMany({
        where: { userId: { in: ids }, isDefault: true, ...ADDRESS_BOOK },
        select: { userId: true, district: true, city: true },
      }),
    ]);
    const byUser = new Map(agg.map((a) => [a.userId, a]));
    const district = new Map(
      defaults.map((a) => [a.userId, a.district ?? a.city]),
    );

    const rows = users.map((u) => {
      const a = byUser.get(u.id);
      const spent = Number(a?._sum.total ?? 0);
      return {
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        role: u.role,
        district: district.get(u.id) ?? null,
        emailVerified: u.emailVerified ? 'yes' : 'no',
        newsletter: u.newsletter ? 'yes' : 'no',
        registeredAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        orders: a?._count ?? 0,
        lifetimeValue: round2(spent),
        avgOrderValue: a?._count ? round2(spent / a._count) : 0,
        lastOrderAt: a?._max.placedAt ?? null,
      };
    });
    return {
      title: 'Customers',
      filename: 'customers',
      meta: { 'Exported at': new Date().toISOString(), Customers: rows.length },
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'status', header: 'Status' },
        { key: 'role', header: 'Role' },
        { key: 'district', header: 'District' },
        { key: 'emailVerified', header: 'Email verified' },
        { key: 'newsletter', header: 'Newsletter' },
        { key: 'registeredAt', header: 'Registered', type: 'date' },
        { key: 'lastLoginAt', header: 'Last login', type: 'date' },
        { key: 'orders', header: 'Orders', type: 'int' },
        { key: 'lifetimeValue', header: 'Lifetime value', type: 'money' },
        { key: 'avgOrderValue', header: 'Average order', type: 'money' },
        { key: 'lastOrderAt', header: 'Last order', type: 'date' },
      ],
      rows,
    };
  }
}
