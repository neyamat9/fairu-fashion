import { AsyncLocalStorage } from 'async_hooks';

// Facts about the HTTP request that is being handled, available anywhere
// below it (services included) without passing them around.
export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

const store = new AsyncLocalStorage<RequestMeta>();

export const runWithRequestMeta = <T>(meta: RequestMeta, fn: () => T): T =>
  store.run(meta, fn);

export const currentRequestMeta = (): RequestMeta | undefined =>
  store.getStore();
