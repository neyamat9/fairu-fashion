import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketNotifierService } from '../../common/notifications';
import {
  AdminListTicketsDto,
  AdminReplyDto,
  AdminUpdateTicketDto,
} from './support-tickets.dto';

const STAFF_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];
const FINISHED = ['RESOLVED', 'CLOSED'] as const;

const customerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
} satisfies Prisma.UserSelect;

@ApiTags('Admin - Support Tickets')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/support-tickets')
export class AdminSupportTicketsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: TicketNotifierService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List tickets (filters, search) with counts per status',
  })
  async list(@CurrentUser() admin: User, @Query() q: AdminListTicketsDto) {
    const search = q.search?.trim();
    const where: Prisma.SupportTicketWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.needsReply ? { status: 'OPEN' } : {}),
      ...(q.priority ? { priority: q.priority } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.assigned === 'me'
        ? { assignedToId: admin.id }
        : q.assigned === 'unassigned'
          ? { assignedToId: null }
          : q.assigned
            ? { assignedToId: q.assigned }
            : {}),
      ...(search
        ? {
            OR: [
              { ticketNumber: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
              {
                submittedBy: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
              {
                submittedBy: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
              { submittedBy: { phone: { contains: search } } },
            ],
          }
        : {}),
    };

    const [rows, total, byStatus] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          submittedBy: { select: customerSelect },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    return {
      data: rows.map(({ _count, ...t }) => ({
        ...t,
        messageCount: _count.messages,
      })),
      counts: Object.fromEntries(
        byStatus.map((g) => [g.status, g._count._all]),
      ),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'A ticket with the whole thread, including internal notes',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        submittedBy: { select: customerSelect },
        assignedTo: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const order = ticket.orderId
      ? await this.prisma.order.findUnique({
          where: { id: ticket.orderId },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            placedAt: true,
          },
        })
      : null;
    return { ...ticket, order };
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Reply to the customer (emailed + in-app) or add an internal note (internal: true)',
  })
  async reply(
    @CurrentUser() admin: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReplyDto,
  ) {
    const ticket = await this.requireTicket(id);
    const internal = dto.internal === true;

    if (!internal && ticket.status === 'CLOSED' && !dto.status) {
      throw new BadRequestException(
        'This ticket is closed. Re-open it first (PATCH status) or send an internal note.',
      );
    }
    if (internal && dto.status) {
      throw new BadRequestException('Internal notes cannot change the status');
    }

    const nextStatus = internal
      ? undefined
      : (dto.status ?? 'WAITING_CUSTOMER');
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(nextStatus ? this.statusFields(nextStatus, ticket) : {}),
        // Internal notes do not count as customer-facing activity.
        ...(internal ? {} : { lastMessageAt: new Date() }),
        // First staff response claims an unassigned ticket.
        ...(!ticket.assignedToId ? { assignedToId: admin.id } : {}),
        messages: {
          create: {
            message: dto.message,
            isStaff: true,
            isInternal: internal,
            userId: admin.id,
          },
        },
      },
    });

    if (!internal) {
      void this.notifier.staffReplied(id, dto.message);
      if (
        nextStatus &&
        FINISHED.includes(nextStatus as 'RESOLVED' | 'CLOSED')
      ) {
        void this.notifier.statusChanged(id, nextStatus);
      }
    }
    return this.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change status, priority or assignee' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateTicketDto,
  ) {
    const ticket = await this.requireTicket(id);
    if (
      dto.status === undefined &&
      dto.priority === undefined &&
      dto.assignedToId === undefined
    ) {
      throw new BadRequestException('Nothing to update');
    }

    if (dto.assignedToId) {
      const agent = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, role: { in: STAFF_ROLES } },
        select: { id: true },
      });
      if (!agent)
        throw new BadRequestException('Assignee must be an admin user');
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== ticket.status;
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(statusChanged ? this.statusFields(dto.status!, ticket) : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assignedToId !== undefined
          ? { assignedToId: dto.assignedToId }
          : {}),
      },
    });

    if (statusChanged) void this.notifier.statusChanged(id, dto.status!);
    return this.findOne(id);
  }

  // isResolved / resolvedAt / closedAt follow the status.
  private statusFields(
    status: string,
    ticket: { resolvedAt: Date | null; closedAt: Date | null },
  ): Prisma.SupportTicketUncheckedUpdateInput {
    const finished = status === 'RESOLVED' || status === 'CLOSED';
    return {
      status: status as Prisma.SupportTicketUncheckedUpdateInput['status'],
      isResolved: finished,
      resolvedAt: finished ? (ticket.resolvedAt ?? new Date()) : null,
      closedAt: status === 'CLOSED' ? (ticket.closedAt ?? new Date()) : null,
    };
  }

  private async requireTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }
}
