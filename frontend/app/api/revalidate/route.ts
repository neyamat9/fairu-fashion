import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** The groups of cached shop data the API may refresh (the same names `lib/api/client.ts` puts on its server fetches). */
const ALLOWED = new Set(["products", "categories", "brands", "banners", "settings", "shipping", "home"]);

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Called by the API server right after the admin saves something (a product, category, banner, setting…),
 * so the shared server cache is refreshed at once instead of waiting for its 5-minute timer.
 *   POST /api/revalidate    header: x-revalidate-secret    body: { "tags": ["products", "home"] }
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret") ?? "";
  if (!secret || !same(given, secret)) return NextResponse.json({ ok: false }, { status: 401 });

  let tags: string[] = [];
  try {
    const body = (await req.json()) as { tags?: unknown };
    if (Array.isArray(body.tags)) tags = body.tags.filter((t): t is string => typeof t === "string" && ALLOWED.has(t));
  } catch {
    /* no / bad body → nothing to do */
  }
  // "max": serve the old copy while the new one is built, so nobody waits
  for (const t of tags) revalidateTag(t, "max");
  return NextResponse.json({ ok: true, revalidated: tags });
}
