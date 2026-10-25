// Prepares data for the activity log: secrets are removed and everything is
// cut down to a bounded size, so the log can never leak a password and a huge
// request can never bloat the table.

const REDACTED = '[redacted]';

// Any key that looks like a secret is replaced, whatever the endpoint.
const SECRET_KEY =
  /pass(word)?|secret|token|api[-_]?key|hash|authorization|cookie|private|credential|otp|cvv|card[-_]?number/i;

// Keys that look secret but are harmless identifiers.
const SAFE_KEYS = new Set(['guestToken', 'tokenType']);

const MAX_STRING = 500;
const MAX_ARRAY = 25;
const MAX_KEYS = 60;
const MAX_DEPTH = 5;
const MAX_JSON_BYTES = 12_000;

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [k: string]: Json };

export function sanitize(value: unknown, depth = 0, key = ''): Json {
  if (key && SECRET_KEY.test(key) && !SAFE_KEYS.has(key)) return REDACTED;
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    return value.length > MAX_STRING
      ? `${value.slice(0, MAX_STRING)}… (${value.length} chars)`
      : value;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  // Prisma Decimal and similar objects with a toJSON/toString
  if (typeof value === 'object' && value !== null) {
    const asObj = value as {
      toJSON?: () => unknown;
      constructor?: { name?: string };
    };
    // decimal.js shape: the class name is minified in the Prisma runtime
    const decimalLike =
      typeof (value as { toFixed?: unknown }).toFixed === 'function' &&
      's' in value &&
      'd' in value;
    if (asObj.constructor?.name === 'Decimal' || decimalLike) {
      return (value as { toString(): string }).toString();
    }
    if (Buffer.isBuffer(value)) return `[binary ${value.length} bytes]`;
    if (depth >= MAX_DEPTH) return '[too deep]';
    if (Array.isArray(value)) {
      const out = value.slice(0, MAX_ARRAY).map((v) => sanitize(v, depth + 1));
      if (value.length > MAX_ARRAY)
        out.push(`… ${value.length - MAX_ARRAY} more`);
      return out;
    }
    const out: { [k: string]: Json } = {};
    let n = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || typeof v === 'function') continue;
      if (++n > MAX_KEYS) {
        out['…'] = 'more fields omitted';
        break;
      }
      out[k] = sanitize(v, depth + 1, k);
    }
    return out;
  }
  return null;
}

// sanitize() plus a hard cap on the serialised size.
export function sanitizeBounded(value: unknown): Json {
  const clean = sanitize(value);
  const size = Buffer.byteLength(JSON.stringify(clean) ?? '');
  if (size <= MAX_JSON_BYTES) return clean;
  return {
    truncated: true,
    bytes: size,
    preview: JSON.stringify(clean).slice(0, 2000),
  };
}

const IGNORED_DIFF_FIELDS = new Set(['updatedAt', 'createdAt']);

function same(a: unknown, b: unknown) {
  return JSON.stringify(sanitize(a)) === JSON.stringify(sanitize(b));
}

// Which fields changed between two row snapshots.
export function diffRows(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  const fields: string[] = [];
  const b: Record<string, Json> = {};
  const a: Record<string, Json> = {};
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const k of keys) {
    if (IGNORED_DIFF_FIELDS.has(k)) continue;
    const bv = before?.[k];
    const av = after?.[k];
    if (same(bv, av)) continue;
    fields.push(k);
    b[k] = sanitize(bv, 1, k);
    a[k] = sanitize(av, 1, k);
  }
  return { fields, before: b, after: a };
}
