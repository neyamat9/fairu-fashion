import { redirect } from "next/navigation";

// There is no separate page any more: the sign-in modal opens over the storefront.
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; session?: string }> }) {
  const { next, session } = await searchParams;
  const q = new URLSearchParams({ auth: "signup" });
  if (next) q.set("next", next);
  if (session) q.set("session", session);
  redirect(`/?${q.toString()}`);
}
