import { getSiteSettings } from "@/lib/services/site.service";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Return policy — Fairu Fashion" };

export default async function ReturnsPolicyPage() {
  const { returns } = await getSiteSettings();
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 text-foreground">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-accent-text">Help</p>
        <h1 className="font-outfit text-4xl font-black tracking-tight">Return <span className="text-accent-text">policy</span></h1>
        {returns.returnsEnabled ? (
          <>
            <p className="mt-6 text-foreground/80">You can ask to return an item within <b>{returns.returnWindowDays} days</b> of delivery.</p>
            {returns.policyText && <div className="mt-6 whitespace-pre-line rounded border border-border bg-muted p-6 text-sm leading-relaxed text-foreground/80">{returns.policyText}</div>}
            <p className="mt-6 text-sm text-muted-foreground">To start a return, open the delivered order in <Link href="/orders" className="font-bold text-accent-text">My orders</Link>.</p>
          </>
        ) : (
          <p className="mt-6 text-muted-foreground">We are not accepting return requests at the moment. Please <Link href="/contact" className="font-bold text-accent-text">contact us</Link> if there is a problem with your order.</p>
        )}
      </div>
    </div>
  );
}
