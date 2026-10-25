import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../../common/decorators';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { csvLine } from '../../common/utils/csv';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivityFilterDto,
  ActivityStatsDto,
  ListActivityDto,
} from './activity-logs.dto';

const EXPORT_MAX_ROWS = 50_000;
const EXPORT_CHUNK = 2000;
const DAY = 86_400_000;

// The activity log is read-only on purpose: there is no endpoint
// deletes entries. Old entries leave only through the retention job.
@ApiTags('Admin - Activity Log')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/activity-logs')
export class ActivityLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary:
      'Activity log: every admin and customer action (who, what, when, from where, result), newest first',
  })
  async list(@Query() q: ListActivityDto) {
    const where = this.where(q);
    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        // The list stays light: before/after/body are in the detail view.
        omit: { before: true, after: true, metadata: true },
      }),
      this.prisma.activityLog.count({ where }),
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

  @Get('stats')
  @ApiOperation({
    summary:
      'Numbers for the dashboard: activity by category / actor / day, top actions, failed logins and blocked requests',
  })
  async stats(@Query() q: ActivityStatsDto) {
    const to = q.to ?? new Date();
    const from = q.from ?? new Date(to.getTime() - 14 * DAY);
    const range = { createdAt: { gte: from, lt: to } };
    const now = Date.now();
    const failedLogin = {
      action: { endsWith: '.auth.login.create' },
      success: false,
    } satisfies Prisma.ActivityLogWhereInput;

    const [
      total,
      failed,
      byCategory,
      byActorType,
      topActions,
      topActors,
      perDay,
      failedLogins24h,
      failedLogins7d,
      blocked24h,
      failedLoginIps,
    ] = await Promise.all([
      this.prisma.activityLog.count({ where: range }),
      this.prisma.activityLog.count({ where: { ...range, success: false } }),
      this.prisma.activityLog.groupBy({
        by: ['category'],
        where: range,
        _count: { _all: true },
        orderBy: { _count: { category: 'desc' } },
      }),
      this.prisma.activityLog.groupBy({
        by: ['actorType'],
        where: range,
        _count: { _all: true },
      }),
      this.prisma.activityLog.groupBy({
        by: ['action'],
        where: range,
        _count: { _all: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.activityLog.groupBy({
        by: ['actorId', 'actorName', 'actorType'],
        where: {
          ...range,
          actorId: { not: null },
          category: { not: 'behavior' },
        },
        _count: { _all: true },
        orderBy: { _count: { actorId: 'desc' } },
        take: 10,
      }),
      this.prisma.$queryRaw<{ day: string; total: bigint; failed: bigint }[]>`
        SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM-DD') AS day,
               COUNT(*)::bigint AS total,
               COUNT(*) FILTER (WHERE NOT success)::bigint AS failed
        FROM "ActivityLog"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.activityLog.count({
        where: { ...failedLogin, createdAt: { gte: new Date(now - DAY) } },
      }),
      this.prisma.activityLog.count({
        where: { ...failedLogin, createdAt: { gte: new Date(now - 7 * DAY) } },
      }),
      this.prisma.activityLog.count({
        where: {
          statusCode: { in: [401, 403, 429] },
          createdAt: { gte: new Date(now - DAY) },
        },
      }),
      this.prisma.activityLog.groupBy({
        by: ['ip'],
        where: {
          ...failedLogin,
          createdAt: { gte: new Date(now - DAY) },
          ip: { not: null },
        },
        _count: { _all: true },
        orderBy: { _count: { ip: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      range: { from, to },
      total,
      failed,
      byCategory: byCategory.map((r) => ({
        category: r.category,
        count: r._count._all,
      })),
      byActorType: byActorType.map((r) => ({
        actorType: r.actorType,
        count: r._count._all,
      })),
      topActions: topActions.map((r) => ({
        action: r.action,
        count: r._count._all,
      })),
      topActors: topActors.map((r) => ({
        actorId: r.actorId,
        name: r.actorName,
        actorType: r.actorType,
        count: r._count._all,
      })),
      perDay: perDay.map((r) => ({
        day: r.day,
        total: Number(r.total),
        failed: Number(r.failed),
      })),
      security: {
        failedLogins24h,
        failedLogins7d,
        blockedRequests24h: blocked24h,
        topFailedLoginIps24h: failedLoginIps.map((r) => ({
          ip: r.ip,
          count: r._count._all,
        })),
      },
    };
  }

  @Get('export')
  @ApiOperation({
    summary: `Download the filtered log as CSV (up to ${EXPORT_MAX_ROWS} rows). The export itself is logged.`,
  })
  async export(@Query() q: ActivityFilterDto, @Res() res: Response) {
    const where = this.where(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="activity-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.write(
      csvLine([
        'time',
        'actorType',
        'actor',
        'email',
        'action',
        'category',
        'summary',
        'entityType',
        'entityId',
        'entity',
        'success',
        'status',
        'ip',
        'method',
        'path',
        'changedFields',
      ]) + '\r\n',
    );

    let written = 0;
    let cursor: string | undefined;
    while (written < EXPORT_MAX_ROWS) {
      const rows = await this.prisma.activityLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: Math.min(EXPORT_CHUNK, EXPORT_MAX_ROWS - written),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        omit: { before: true, after: true, metadata: true },
      });
      if (!rows.length) break;
      for (const r of rows) {
        res.write(
          csvLine([
            r.createdAt,
            r.actorType,
            r.actorName,
            r.actorEmail,
            r.action,
            r.category,
            r.summary,
            r.entityType,
            r.entityId,
            r.entityLabel,
            r.success,
            r.statusCode,
            r.ip,
            r.method,
            r.path,
            Array.isArray(r.changes) ? (r.changes as unknown[]).join(' ') : '',
          ]) + '\r\n',
        );
      }
      written += rows.length;
      cursor = rows[rows.length - 1].id;
      if (rows.length < EXPORT_CHUNK) break;
    }
    res.end();
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary:
      'History of one record, e.g. /entity/product/<id> or /entity/order/<id>',
  })
  async entityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() q: ListActivityDto,
  ) {
    return this.list({ ...q, entityType, entityId });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'One entry in full: before/after values and the request details',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.prisma.activityLog.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Log entry not found');
    return row;
  }

  private where(q: ActivityFilterDto): Prisma.ActivityLogWhereInput {
    const and: Prisma.ActivityLogWhereInput[] = [];
    if (q.actorType) and.push({ actorType: q.actorType });
    if (q.actorId) and.push({ actorId: q.actorId });
    if (q.category) and.push({ category: q.category });
    if (q.entityType)
      and.push({ entityType: { equals: q.entityType, mode: 'insensitive' } });
    if (q.entityId) and.push({ entityId: q.entityId });
    if (q.success !== undefined) and.push({ success: q.success });
    if (q.method) and.push({ method: q.method });
    if (q.ip) and.push({ ip: q.ip });
    if (q.action) and.push({ action: { startsWith: q.action } });
    if (q.from || q.to) {
      and.push({
        createdAt: {
          ...(q.from ? { gte: q.from } : {}),
          ...(q.to ? { lt: q.to } : {}),
        },
      });
    }
    const actor = q.actor?.trim();
    if (actor) {
      and.push({
        OR: [
          { actorName: { contains: actor, mode: 'insensitive' } },
          { actorEmail: { contains: actor, mode: 'insensitive' } },
        ],
      });
    }
    const text = q.q?.trim();
    if (text) {
      and.push({
        OR: [
          { summary: { contains: text, mode: 'insensitive' } },
          { actorName: { contains: text, mode: 'insensitive' } },
          { actorEmail: { contains: text, mode: 'insensitive' } },
          { entityLabel: { contains: text, mode: 'insensitive' } },
          { path: { contains: text, mode: 'insensitive' } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }
}
