import type { ActivityActorType } from '@prisma/client';
import type { Json } from './sanitize';

export interface ActivityEntry {
  actorType: ActivityActorType;
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;

  action: string;
  category: string;
  summary: string;

  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;

  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  success?: boolean;
  errorMessage?: string | null;

  before?: Json | null;
  after?: Json | null;
  changes?: Json | null;
  metadata?: Json | null;

  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  durationMs?: number | null;
}

// Short-lived behaviour events (cart, wishlist...) are kept for less time.
export const BEHAVIOR_CATEGORY = 'behavior';

// What the interceptor learns while the request runs; the middleware turns it
// into a log entry once the response is finished.
export interface ActivityContext {
  skip?: boolean;
  action?: string;
  category?: string;
  summary?: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  // Actor that only becomes known from the response (login / register)
  actor?: { id: string; name: string; email: string; role: string };
  metadata?: Record<string, unknown>;
}

export const ACTIVITY_KEY = '__activity';
