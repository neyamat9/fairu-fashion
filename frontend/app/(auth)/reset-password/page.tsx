import { redirect } from "next/navigation";

// The link in the reset email lands here and opens the "choose a new password" modal over the storefront.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  redirect(`/?reset=${encodeURIComponent(token ?? "")}`);
}
