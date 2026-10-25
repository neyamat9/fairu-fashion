import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StorefrontSyncService } from './storefront-sync.service';

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Which cached storefront data an admin change makes stale (the same names the storefront tags its fetches with). */
function tagsFor(path: string): string[] {
  // a customer posting a review or question changes what the product page shows
  if (/\/customer\/products\/[^/]+\/(reviews|questions)/i.test(path))
    return ['products'];
  // placing or cancelling an order moves stock and the sold counts shown on cards and product pages
  if (/\/customer\/(orders|checkout)/i.test(path)) return ['products', 'home'];
  const m = /\/admin\/([a-z-]+)/i.exec(path);
  if (!m) return [];
  switch (m[1].toLowerCase()) {
    case 'products':
    case 'product':
    case 'inventory':
    case 'reviews':
    case 'flash-deals':
    case 'questions': // an answered question shows on the product page
    case 'orders': // status changes put stock back and count sales
    case 'returns': // an accepted return restocks
      return ['products', 'home'];
    case 'categories':
    case 'category':
    case 'sub-categories':
    case 'sub-category':
      return ['categories', 'products', 'home'];
    case 'brands':
    case 'brand':
      return ['brands', 'products', 'home'];
    case 'banners':
      return ['banners', 'home'];
    case 'settings':
      return ['settings', 'shipping'];
    default:
      return [];
  }
}

/**
 * After an admin successfully changes a product, order, category, brand, banner or setting, tell the storefront to refresh its
 * shared page cache for that data right away (instead of waiting for the 5-minute timer), and bump the content version that
 * open browsers poll. Fire-and-forget: a storefront that is down or not configured never affects the admin's save.
 */
@Injectable()
export class StorefrontRevalidateInterceptor implements NestInterceptor {
  constructor(private readonly sync: StorefrontSyncService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Request>();
    if (!WRITES.has(req.method)) return next.handle();
    const tags = tagsFor(req.originalUrl ?? req.url);
    if (!tags.length) return next.handle();
    return next.handle().pipe(tap({ next: () => this.sync.notify(tags) }));
  }
}
