import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALL_TAGS = [
  'products',
  'categories',
  'brands',
  'banners',
  'settings',
  'shipping',
  'home',
];

/**
 * Keeps the public storefront in step with the admin:
 *  1. `notify(tags)` bumps the content version (read by open browsers through GET /customer/content-version) at once, and
 *  2. asks the storefront to refresh its shared page cache for those tags (batched, one retry).
 * Versions are `<boot id>.<counter>`: a server restart changes every version, which only makes open pages refresh once.
 */
@Injectable()
export class StorefrontSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(StorefrontSyncService.name);
  private readonly url: string;
  private readonly secret: string | undefined;
  private readonly boot = Date.now().toString(36);
  private counter = 0;
  private readonly tagVersions = new Map<string, string>();
  private pending = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private lastChange: string | null = null;
  private last: {
    at: string;
    ok: boolean;
    tags: string[];
    error?: string;
  } | null = null;

  constructor(config: ConfigService) {
    this.url = (
      config.get<string>('frontend.url') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    this.secret = config.get<string>('REVALIDATE_SECRET');
  }

  /** Current versions: `version` changes whenever anything did; `tags` says which group. */
  snapshot() {
    return {
      version: this.version(),
      tags: Object.fromEntries(this.tagVersions),
    };
  }

  /** For the admin header: is the storefront in step with the admin? */
  status() {
    return {
      configured: !!this.secret,
      lastChange: this.lastChange,
      last: this.last,
      pending: this.pending.size > 0,
    };
  }

  /** Something the storefront shows has changed. */
  notify(tags: string[]) {
    if (!tags.length) return;
    this.counter += 1;
    this.lastChange = new Date().toISOString();
    const v = `${this.boot}.${this.counter}`;
    for (const t of tags) {
      this.tagVersions.set(t, v);
      this.pending.add(t);
    }
    if (!this.secret || this.timer) return;
    // several saves in a row (bulk edits) become one call
    this.timer = setTimeout(() => {
      const batch = [...this.pending];
      this.pending = new Set();
      this.timer = null;
      void this.send(batch);
    }, 400);
  }

  /** Push now (the admin's "Retry"): refreshes every group. */
  async publishNow() {
    if (this.secret) {
      this.counter += 1;
      const v = `${this.boot}.${this.counter}`;
      for (const t of ALL_TAGS) this.tagVersions.set(t, v);
      await this.send(ALL_TAGS);
    }
    return this.status();
  }

  private version() {
    return `${this.boot}.${this.counter}`;
  }

  private async send(tags: string[], attempt = 1): Promise<void> {
    let error = '';
    try {
      const res = await fetch(`${this.url}/api/revalidate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': this.secret as string,
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        this.last = { at: new Date().toISOString(), ok: true, tags };
        return;
      }
      error = `The storefront answered ${res.status}`;
      this.logger.warn(`Storefront refresh answered ${res.status}`);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      this.logger.debug(`Storefront refresh failed: ${error}`);
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500));
      return this.send(tags, attempt + 1);
    }
    this.last = { at: new Date().toISOString(), ok: false, tags, error };
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }
}
