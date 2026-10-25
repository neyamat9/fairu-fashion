import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_META, ActivityOptions } from './activity.decorator';
import { ACTIVITY_KEY, ActivityContext } from './activity.types';
import { ADMIN_ENTITIES, parseRoute } from './activity-resolver';

type Row = Record<string, unknown>;
type Delegate = {
  findUnique(args: { where: Record<string, unknown> }): Promise<Row | null>;
};

const EDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// While an admin request runs, remembers what it changed: a copy of the row
// before and after, so the log can show "price: 100 → 90". The log entry
// itself is written by ActivityMiddleware when the response is done.
@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityInterceptor.name);
  private readonly apiPrefix: string;

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
    config: ConfigService,
  ) {
    this.apiPrefix = config.get<string>('app.apiPrefix') ?? 'api';
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request>();
    const ctx: ActivityContext = {};
    (req as unknown as Record<string, unknown>)[ACTIVITY_KEY] = ctx;

    const opts = this.reflector.getAllAndOverride<ActivityOptions | undefined>(
      ACTIVITY_META,
      [context.getHandler(), context.getClass()],
    );
    if (opts?.skip) ctx.skip = true;
    if (opts?.action) ctx.action = opts.action;
    if (opts?.category) ctx.category = opts.category;
    if (opts?.summary) ctx.summary = opts.summary;

    const info = parseRoute(
      (req.route as { path?: string } | undefined)?.path ?? req.path,
      req.params as Record<string, string | undefined>,
      this.apiPrefix,
    );

    // Admin edits: snapshot the row before the handler changes it.
    const target =
      info.area === 'admin' && EDIT_METHODS.has(req.method)
        ? this.target(info)
        : undefined;
    if (target?.id) {
      ctx.before = await this.snapshot(target);
    }

    // Wait for the after-snapshot so it is ready before the response ends.
    return next.handle().pipe(
      mergeMap(async (data: unknown) => {
        await this.afterSuccess(ctx, req, info, target, data);
        return data;
      }),
    );
  }

  // What this request edits: [model, id], or the settings group.
  private target(info: ReturnType<typeof parseRoute>) {
    if (info.resource === 'settings' && info.tail[0]) {
      return {
        type: 'setting',
        model: 'siteSetting',
        key: info.tail[0],
        id: info.tail[0],
      };
    }
    const sub =
      info.tail[0] && info.subId
        ? `${info.resource}.${info.tail[0]}`
        : undefined;
    const def = (sub && ADMIN_ENTITIES[sub]) || ADMIN_ENTITIES[info.resource];
    const id = sub && ADMIN_ENTITIES[sub] ? info.subId : info.id;
    return def && id ? { ...def, id } : undefined;
  }

  private async snapshot(target: {
    model: string;
    id: string;
    key?: string;
  }): Promise<Row | null> {
    try {
      const delegate = (this.prisma as unknown as Record<string, Delegate>)[
        target.model
      ];
      if (!delegate) return null;
      const row = await delegate.findUnique({
        where: target.key ? { key: target.key } : { id: target.id },
      });
      if (!row) return null;
      // Settings are stored as one JSON string: show them field by field.
      if (target.key && typeof row.value === 'string') {
        try {
          return JSON.parse(row.value) as Row;
        } catch {
          return { value: row.value };
        }
      }
      return row;
    } catch (error) {
      this.logger.debug(
        `Snapshot of ${target.model} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async afterSuccess(
    ctx: ActivityContext,
    req: Request,
    info: ReturnType<typeof parseRoute>,
    target: ReturnType<ActivityInterceptor['target']>,
    raw: unknown,
  ) {
    try {
      // Handlers return plain data; if another interceptor already wrapped it
      // ({ success, data }), look inside.
      const data = unwrap(raw);

      // Who logged in / registered: only the response knows.
      if (data && typeof data === 'object' && 'user' in data) {
        const u = (data as { user?: Row }).user;
        if (u && typeof u.id === 'string') {
          ctx.actor = {
            id: u.id,
            name: typeof u.name === 'string' ? u.name : '',
            email: typeof u.email === 'string' ? u.email : '',
            role: typeof u.role === 'string' ? u.role : 'USER',
          };
        }
      }

      // The thing that was created / acted on, from the response
      const rowFromResponse =
        data && typeof data === 'object' && !Array.isArray(data)
          ? (data as Row)
          : undefined;
      const respId =
        rowFromResponse && typeof rowFromResponse.id === 'string'
          ? rowFromResponse.id
          : undefined;
      const label =
        rowFromResponse &&
        (
          [
            'orderNumber',
            'ticketNumber',
            'name',
            'code',
            'title',
            'sku',
            'email',
            'subject',
          ] as const
        )
          .map((k) => rowFromResponse[k])
          .find((v): v is string => typeof v === 'string' && !!v);
      if (label) ctx.entityLabel = label;

      const id = target?.id ?? info.subId ?? info.id ?? respId;
      if (id) ctx.entityId = id;

      if (info.area === 'admin' && EDIT_METHODS.has(req.method)) {
        if (req.method === 'DELETE') {
          ctx.after = null;
        } else {
          const t =
            target ??
            (respId
              ? this.target({ ...info, id: respId, subId: undefined })
              : undefined);
          if (t?.id) {
            ctx.after = await this.snapshot(t);
            if (!ctx.entityId) ctx.entityId = t.id;
          }
        }
        const row = ctx.after ?? ctx.before;
        const def =
          target && 'label' in target
            ? (target as { label: (r: Row) => string | undefined })
            : undefined;
        if (row && def) ctx.entityLabel = def.label(row) ?? ctx.entityLabel;
      }
    } catch (error) {
      this.logger.debug(
        `Activity after-hook failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function unwrap(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'success' in raw && 'data' in raw) {
    return (raw as { data: unknown }).data;
  }
  return raw;
}
