import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { runWithRequestMeta } from './request-context';
import { ActivityLogService } from './activity-log.service';
import { ACTIVITY_KEY, ActivityContext, ActivityEntry } from './activity.types';
import {
  actionFor,
  categoryFor,
  describe,
  entityTypeFor,
  parseRoute,
} from './activity-resolver';
import { sanitizeBounded, diffRows, Json } from './sanitize';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Reads that are always logged: they hand out personal data in bulk, or are
// public look-ups that need an order number + phone.
const SENSITIVE_GET = [
  /\/export(\/|$)/,
  /\/invoice(\/|$)?/,
  /\/orders\/track(\/|$)/,
  /\/admin\/reports\//,
];

// Requests that are not user actions at all
const SKIP_PATHS = [/^\/uploads\//, /\/ping(\/|$)/];

// A blocked-request flood (HTTP 429) is recorded once per IP and path per minute
const RATE_LIMIT_WINDOW_MS = 60_000;

const GUEST_HEADER = 'x-guest-token';

@Injectable()
export class ActivityMiddleware implements NestMiddleware {
  private readonly apiPrefix: string;
  private readonly logAdminReads: boolean;
  private readonly lastRateLimited = new Map<string, number>();

  constructor(
    private activity: ActivityLogService,
    config: ConfigService,
  ) {
    this.apiPrefix = config.get<string>('app.apiPrefix') ?? 'api';
    this.logAdminReads =
      config.get<boolean>('activityLog.logAdminReads') ?? false;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];
    if (SKIP_PATHS.some((re) => re.test(path)) || !this.shouldLog(req, path)) {
      return next();
    }

    const started = Date.now();
    res.on('finish', () => {
      try {
        const entry = this.build(req, res, path, Date.now() - started);
        if (entry) this.activity.record(entry);
      } catch {
        // logging must never affect the request
      }
    });
    const requestId = req.headers['x-request-id'];
    runWithRequestMeta(
      {
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
        requestId: Array.isArray(requestId)
          ? requestId[0]
          : (requestId ?? null),
      },
      () => next(),
    );
  }

  private shouldLog(req: Request, path: string): boolean {
    if (MUTATING.has(req.method)) return true;
    if (req.method !== 'GET') return false;
    if (SENSITIVE_GET.some((re) => re.test(path))) return true;
    return this.logAdminReads && path.startsWith(`/${this.apiPrefix}/admin/`);
  }

  private build(
    req: Request,
    res: Response,
    path: string,
    durationMs: number,
  ): ActivityEntry | null {
    const ctx = ((req as unknown as Record<string, unknown>)[ACTIVITY_KEY] ??
      {}) as ActivityContext;
    if (ctx.skip) return null;

    const statusCode = res.statusCode;
    const route = (req.route as { path?: string } | undefined)?.path;
    // Requests that matched no route (bots probing) are not user actions.
    if (!route && statusCode === 404) return null;

    const ip = req.ip ?? null;
    if (statusCode === 429 && !this.firstRateLimit(`${ip}|${path}`))
      return null;

    const info = parseRoute(
      route ?? path,
      req.params as Record<string, string | undefined>,
      this.apiPrefix,
    );

    // ----- who -----
    const user = (req as Request & { user?: User }).user;
    let actorType: ActivityEntry['actorType'] = 'GUEST';
    let actorId: string | null = null;
    let actorName: string | null = null;
    let actorEmail: string | null = null;
    const who = user
      ? { id: user.id, name: user.name, email: user.email, role: user.role }
      : ctx.actor;
    if (who) {
      actorType =
        who.role === 'ADMIN' || who.role === 'SUPER_ADMIN'
          ? 'ADMIN'
          : 'CUSTOMER';
      actorId = who.id;
      actorName = who.name;
      actorEmail = who.email;
    } else {
      const raw = req.headers[GUEST_HEADER];
      const token = Array.isArray(raw) ? raw[0] : raw;
      actorName = token ? `Guest ${token.slice(0, 8)}` : 'Guest';
    }

    // ----- what -----
    const action = ctx.action ?? actionFor(info, req.method);
    const category = ctx.category ?? categoryFor(info);
    const entityType = ctx.entityType ?? entityTypeFor(info);
    const entityId = ctx.entityId ?? info.subId ?? info.id ?? null;
    const actorLabel = actorType === 'ADMIN' ? 'Admin' : (actorName ?? 'Guest');
    const success = statusCode < 400;

    let summary =
      ctx.summary ??
      describe({
        actor:
          actorType === 'ADMIN'
            ? `Admin ${actorName ?? ''}`.trim()
            : actorLabel,
        action,
        method: req.method,
        info,
        entityType,
        entityLabel: ctx.entityLabel,
      });
    if (!success) {
      summary =
        action.endsWith('.login.create') && !who
          ? `Failed login attempt${this.attemptedEmail(req) ? ` for ${this.attemptedEmail(req)}` : ''}`
          : `${summary} — failed (${statusCode})`;
    }

    // ----- details -----
    const metadata: Record<string, Json> = {};
    const body = sanitizeBounded(req.body);
    if (body && typeof body === 'object' && Object.keys(body).length)
      metadata.body = body;
    if (req.method === 'GET' && Object.keys(req.query).length) {
      metadata.query = sanitizeBounded(req.query);
    }
    const files = this.files(req);
    if (files.length) metadata.files = files;
    if (!who && action.includes('.auth.')) {
      const email = this.attemptedEmail(req);
      if (email) {
        metadata.attemptedEmail = email;
        actorEmail = email;
      }
    }
    if (ctx.metadata)
      Object.assign(metadata, sanitizeBounded(ctx.metadata) as object);

    let changes: Json | null = null;
    let before: Json | null = null;
    let after: Json | null = null;
    if (ctx.before !== undefined || ctx.after !== undefined) {
      if (ctx.before && ctx.after) {
        const d = diffRows(ctx.before, ctx.after);
        if (d.fields.length) {
          changes = d.fields;
          before = d.before;
          after = d.after;
        }
      } else if (ctx.after) {
        after = sanitizeBounded(ctx.after);
      } else if (ctx.before) {
        before = sanitizeBounded(ctx.before);
      }
    }

    const requestId = req.headers['x-request-id'];
    return {
      actorType,
      actorId,
      actorName,
      actorEmail,
      action,
      category,
      summary,
      entityType: entityType ?? null,
      entityId,
      entityLabel: ctx.entityLabel ?? null,
      method: req.method,
      path,
      statusCode,
      success,
      errorMessage: success
        ? null
        : ((res.locals?.errorMessage as string | undefined) ??
          defaultMessage(statusCode)),
      before,
      after,
      changes,
      metadata: Object.keys(metadata).length ? metadata : null,
      ip,
      userAgent: req.get('user-agent') ?? null,
      requestId: Array.isArray(requestId) ? requestId[0] : (requestId ?? null),
      durationMs,
    };
  }

  private attemptedEmail(req: Request): string | undefined {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return typeof email === 'string'
      ? email.trim().toLowerCase().slice(0, 254)
      : undefined;
  }

  private files(req: Request): Json[] {
    const raw =
      (req as Request & { files?: unknown; file?: unknown }).files ??
      (req as Request & { file?: unknown }).file;
    const list = (Array.isArray(raw) ? raw : raw ? [raw] : []) as {
      originalname?: string;
      mimetype?: string;
      size?: number;
    }[];
    return list.slice(0, 20).map((f) => ({
      name: f.originalname ?? null,
      type: f.mimetype ?? null,
      bytes: f.size ?? null,
    }));
  }

  private firstRateLimit(key: string): boolean {
    const now = Date.now();
    const last = this.lastRateLimited.get(key);
    if (last && now - last < RATE_LIMIT_WINDOW_MS) return false;
    this.lastRateLimited.set(key, now);
    if (this.lastRateLimited.size > 5000) {
      for (const [k, t] of this.lastRateLimited) {
        if (now - t > RATE_LIMIT_WINDOW_MS) this.lastRateLimited.delete(k);
      }
    }
    return true;
  }
}

function defaultMessage(status: number) {
  switch (status) {
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 429:
      return 'Too many requests';
    default:
      return `HTTP ${status}`;
  }
}
