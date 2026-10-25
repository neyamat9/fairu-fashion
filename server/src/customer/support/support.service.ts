import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { nextTicketNumber } from '../../common/orders/order-lifecycle';
import { TicketNotifierService } from '../../common/notifications';
import {
  CreateTicketDto,
  ListTicketsDto,
  TicketMessageDto,
} from './support.dto';

const MAX_OPEN_TICKETS = 5;
const MAX_MESSAGES_PER_TICKET = 200;
const CLOSED_STATUSES = ['RESOLVED', 'CLOSED'] as const;

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notifier: TicketNotifierService,
  ) {}

  async create(userId: string, dto: CreateTicketDto) {
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, userId },
        select: { id: true },
      });
      if (!order) throw new NotFoundException('Order not found');
    }

    const open = await this.prisma.supportTicket.count({
      where: {
        submittedById: userId,
        status: { notIn: [...CLOSED_STATUSES] },
      },
    });
    if (open >= MAX_OPEN_TICKETS) {
      throw new BadRequestException(
        `You already have ${MAX_OPEN_TICKETS} open tickets. Please wait for a reply or close one before opening another.`,
      );
    }

    const ticket = await this.prisma.$transaction(async (tx) => {
      const ticketNumber = await nextTicketNumber(tx);
      return tx.supportTicket.create({
        data: {
          ticketNumber,
          subject: dto.subject,
          message: dto.message,
          category: dto.category ?? 'OTHER',
          orderId: dto.orderId ?? null,
          submittedById: userId,
          messages: {
            create: { message: dto.message, isStaff: false, userId },
          },
        },
      });
    });

    void this.notifier.customerWrote(ticket.id, dto.message, true);
    return this.findOne(userId, ticket.id);
  }

  async list(userId: string, q: ListTicketsDto) {
    const where: Prisma.SupportTicketWhereInput = {
      submittedById: userId,
      ...(q.status ? { status: q.status } : {}),
    };
    const [rows, total] = await Promise.all([
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
          orderId: true,
          lastMessageAt: true,
          createdAt: true,
          _count: { select: { messages: { where: { isInternal: false } } } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    const orderNumbers = await this.orderNumbers(rows.map((r) => r.orderId));
    return {
      data: rows.map(({ _count, orderId, ...t }) => ({
        ...t,
        orderId,
        orderNumber: orderId ? (orderNumbers.get(orderId) ?? null) : null,
        messageCount: _count.messages,
      })),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, submittedById: userId },
      include: {
        messages: {
          // Staff-only notes are never shown to the customer.
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const orderNumbers = await this.orderNumbers([ticket.orderId]);
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      category: ticket.category,
      priority: ticket.priority,
      orderId: ticket.orderId,
      orderNumber: ticket.orderId
        ? (orderNumbers.get(ticket.orderId) ?? null)
        : null,
      createdAt: ticket.createdAt,
      lastMessageAt: ticket.lastMessageAt,
      closedAt: ticket.closedAt,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        message: m.message,
        fromStaff: m.isStaff,
        // Customers see "Support team", never an agent's name.
        author: m.isStaff ? 'Support team' : m.user.name,
        createdAt: m.createdAt,
      })),
    };
  }

  async reply(userId: string, id: string, dto: TicketMessageDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, submittedById: userId },
      include: { _count: { select: { messages: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException(
        'This ticket is closed. Please open a new ticket.',
      );
    }
    if (ticket._count.messages >= MAX_MESSAGES_PER_TICKET) {
      throw new BadRequestException(
        'This ticket has reached its message limit. Please open a new ticket.',
      );
    }

    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        // A reply re-opens a resolved ticket and hands the ball to us.
        status: 'OPEN',
        isResolved: false,
        resolvedAt: null,
        lastMessageAt: new Date(),
        messages: {
          create: { message: dto.message, isStaff: false, userId },
        },
      },
    });

    void this.notifier.customerWrote(id, dto.message, false);
    return this.findOne(userId, id);
  }

  async close(userId: string, id: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, submittedById: userId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'CLOSED') {
      await this.prisma.supportTicket.update({
        where: { id },
        data: {
          status: 'CLOSED',
          isResolved: true,
          resolvedAt: ticket.resolvedAt ?? new Date(),
          closedAt: new Date(),
        },
      });
    }
    return this.findOne(userId, id);
  }

  private async orderNumbers(ids: (string | null)[]) {
    const wanted = [...new Set(ids.filter((i): i is string => !!i))];
    if (!wanted.length) return new Map<string, string>();
    const rows = await this.prisma.order.findMany({
      where: { id: { in: wanted } },
      select: { id: true, orderNumber: true },
    });
    return new Map(rows.map((r) => [r.id, r.orderNumber]));
  }
}
