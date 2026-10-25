/**
 * A tiny in-memory cache for repeat requests made in the browser (same words typed again, same list opened again).
 * Entries live for `ttlMs`; a request already running is shared. Only used where a few minutes of age is harmless.
 */
const store = new Map<string, { at: number; value: unknown }>();
const running = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 200;

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return load(); // on the server the shared Next.js cache already does this
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value as T);
  const going = running.get(key);
  if (going) return going as Promise<T>;
  const p = load()
    .then((value) => {
      store.set(key, { at: Date.now(), value });
      if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string);
      return value;
    })
    .finally(() => running.delete(key));
  running.set(key, p);
  return p;
}

/** Forget cached answers (all, or those whose key starts with `prefix`). */
export function forgetMemo(prefix = '') {
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k);
}
