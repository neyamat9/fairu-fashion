import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityEntry, BEHAVIOR_CATEGORY } from './activity.types';

const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PURGE_BATCH = 5000;

const json = (
  v: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined =>
  v === undefined
    ? undefined
    : v === null
      ? Prisma.JsonNull
      : (v as Prisma.InputJsonValue);

// Writes the activity log. record() never throws and never waits: a logging
// problem must not break (or slow down) the request it describes.
@Injectable()
export class ActivityLogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityLogService.name);
  private timer?: NodeJS.Timeout;
  private startTimer?: NodeJS.Timeout;
  private readonly retentionDays: number;
  private readonly behaviorRetentionDays: number;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.retentionDays = config.get<number>('activityLog.retentionDays') ?? 365;
    this.behaviorRetentionDays =
      config.get<number>('activityLog.behaviorRetentionDays') ?? 30;
  }

  onModuleInit() {
    this.timer = setInterval(() => void this.purge(), PURGE_INTERVAL_MS);
    this.timer.unref();
    // also shortly after start, so a restarted server catches up
    this.startTimer = setTimeout(() => void this.purge(), 60_000);
    this.startTimer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.startTimer) clearTimeout(this.startTimer);
  }

  record(entry: ActivityEntry): void {
    void this.write(entry);
  }

  // For code that wants to be sure the row is stored before continuing.
  async write(entry: ActivityEntry): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          actorType: entry.actorType,
          actorId: entry.actorId ?? null,
          actorName: entry.actorName?.slice(0, 200) ?? null,
          actorEmail: entry.actorEmail?.slice(0, 254) ?? null,
          action: entry.action.slice(0, 150),
          category: entry.category,
          summary: entry.summary.slice(0, 1000),
          entityType: entry.entityType ?? null,
          entityId: entry.entityId ?? null,
          entityLabel: entry.entityLabel?.slice(0, 300) ?? null,
          method: entry.method ?? null,
          path: entry.path?.slice(0, 500) ?? null,
          statusCode: entry.statusCode ?? null,
          success: entry.success ?? true,
          errorMessage: entry.errorMessage?.slice(0, 500) ?? null,
          before: json(entry.before),
          after: json(entry.after),
          changes: json(entry.changes),
          metadata: json(entry.metadata),
          ip: entry.ip?.slice(0, 64) ?? null,
          userAgent: entry.userAgent?.slice(0, 300) ?? null,
          requestId: entry.requestId?.slice(0, 100) ?? null,
          durationMs: entry.durationMs ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Could not store activity "${entry.action}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Something the system did on its own (scheduled jobs, automatic changes).
  system(
    action: string,
    summary: string,
    extra: Partial<ActivityEntry> = {},
  ): void {
    this.record({
      actorType: 'SYSTEM',
      actorName: 'System',
      action,
      category: 'system',
      summary,
      ...extra,
    });
  }

  // Retention: everything older than retentionDays goes; short-lived
  // behaviour events (cart, wishlist...) go after behaviorRetentionDays.
  async purge() {
    try {
      const day = 86_400_000;
      let total = 0;
      for (const [where, label] of [
        [
          {
            category: BEHAVIOR_CATEGORY,
            createdAt: {
              lt: new Date(Date.now() - this.behaviorRetentionDays * day),
            },
          },
          'behaviour',
        ],
        [
          {
            createdAt: { lt: new Date(Date.now() - this.retentionDays * day) },
          },
          'old',
        ],
      ] as const) {
        for (;;) {
          const rows = await this.prisma.activityLog.findMany({
            where,
            select: { id: true },
            take: PURGE_BATCH,
          });
          if (!rows.length) break;
          const { count } = await this.prisma.activityLog.deleteMany({
            where: { id: { in: rows.map((r) => r.id) } },
          });
          total += count;
          this.logger.debug(`Purged ${count} ${label} activity rows`);
          if (rows.length < PURGE_BATCH) break;
        }
      }
      if (total)
        this.logger.log(`Activity log retention removed ${total} rows`);
    } catch (error) {
      this.logger.warn(
        `Activity log purge failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
