import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ACTIONS, AUDIT_TYPES } from '../../common/audit';
import { csvLine } from '../../common/utils/csv';
import { AuditFilterDto, ListAuditDto } from './audit-logs.dto';

const EXPORT_MAX = 20000;
const CHUNK = 500;

type Row = Prisma.AuditLogGetPayload<{
  include: { user: { select: { id: true; name: true; email: true } } };
}>;

const parse = (text: string | null): Record<string, unknown> | null => {
  if (!text) return null;
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === 'object'
      ? (v as Record<string, unknown>)
      : { value: v };
  } catch {
    return { value: text };
  }
};

// Field-by-field "from → to" for the values that differ.
function changesOf(
  oldV: Record<string, unknown> | null,
  newV: Record<string, unknown> | null,
) {
  const keys = new Set([
    ...Object.keys(oldV ?? {}),
    ...Object.keys(newV ?? {}),
  ]);
  const out: { field: string; from: unknown; to: unknown }[] = [];
  for (const k of keys) {
    const a = oldV?.[k];
    const b = newV?.[k];
    if (JSON.stringify(a) !== JSON.stringify(b))
      out.push({ field: k, from: a ?? null, to: b ?? null });
  }
  return out;
}

@ApiTags('Admin - Audit Log')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  private where(q: AuditFilterDto): Prisma.AuditLogWhereInput {
    const actions = q.type ? AUDIT_TYPES[q.type] : undefined;
    const and: Prisma.AuditLogWhereInput[] = [];
    if (actions) and.push({ action: { in: actions } });
    if (q.action) and.push({ action: q.action });
    if (q.entity)
      and.push({ entity: { equals: q.entity, mode: 'insensitive' } });
    if (q.entityId) and.push({ entityId: q.entityId });
    if (q.adminId) and.push({ userId: q.adminId });
    if (q.from || q.to) {
      and.push({
        createdAt: {
          ...(q.from ? { gte: q.from } : {}),
          ...(q.to ? { lt: q.to } : {}),
        },
      });
    }
    if (q.q) {
      and.push({
        OR: [
          { oldValue: { contains: q.q, mode: 'insensitive' } },
          { newValue: { contains: q.q, mode: 'insensitive' } },
          { entityId: q.q },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private view(r: Row) {
    const oldValue = parse(r.oldValue);
    const newValue = parse(r.newValue);
    return {
      id: r.id,
      at: r.createdAt,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      admin: r.user,
      oldValue,
      newValue,
      changes: changesOf(oldValue, newValue),
      ip: r.ipAddress,
      userAgent: r.userAgent,
    };
  }

  @Get()
  @ApiOperation({
    summary:
      'Who changed prices, stock, order status, settings, coupons, customers: the admin, the old and new values, when and from where',
  })
  async list(@Query() q: ListAuditDto) {
    const where = this.where(q);
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      data: rows.map((r) => this.view(r)),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  @Get('types')
  @ApiOperation({ summary: 'The filter groups and actions that can appear' })
  types() {
    return { types: AUDIT_TYPES, actions: AUDIT_ACTIONS };
  }

  @Get('export')
  @ApiOperation({
    summary: `Download the filtered audit log as CSV (up to ${EXPORT_MAX} rows)`,
  })
  async export(@Query() q: AuditFilterDto, @Res() res: Response) {
    const where = this.where(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.write(
      csvLine([
        'time',
        'admin',
        'email',
        'action',
        'entity',
        'entityId',
        'field',
        'from',
        'to',
        'ip',
      ]) + '\r\n',
    );
    let written = 0;
    let cursor: string | undefined;
    while (written < EXPORT_MAX) {
      const rows = await this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: Math.min(CHUNK, EXPORT_MAX - written),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!rows.length) break;
      for (const r of rows) {
        const v = this.view(r);
        const changes = v.changes.length
          ? v.changes
          : [{ field: '', from: '', to: '' }];
        for (const c of changes) {
          res.write(
            csvLine([
              v.at,
              v.admin.name,
              v.admin.email,
              v.action,
              v.entity,
              v.entityId ?? '',
              c.field,
              c.from,
              c.to,
              v.ip ?? '',
            ]) + '\r\n',
          );
        }
      }
      written += rows.length;
      cursor = rows[rows.length - 1].id;
      if (rows.length < CHUNK) break;
    }
    res.end();
  }
}
