import CheckoutHeaderUser from "@/components/checkout/CheckoutHeaderUser";
import BrandLogo from "@/components/layout/BrandLogo";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

/**
 * The focused checkout header — logo, a way back to the cart, who is checking out and a "secure" label.
 * No category bar or footer, so nothing pulls the buyer away mid-purchase. Shared by the checkout layout and
 * by the instant-loading skeleton, so the skeleton shows the very same header the page will have.
 */
export default function CheckoutHeader() {
  return (
    <header className="bg-card border-b border-border py-4 sticky top-0 z-[1001] shadow-[0_10px_30px_rgba(10,42,94,0.18)]">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BrandLogo size="md" />
          <Link href="/cart" className="hidden items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:inline-flex">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to cart
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/cart" aria-label="Back to cart" className="inline-flex h-9 w-9 items-center justify-center rounded border border-border text-foreground sm:hidden">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <CheckoutHeaderUser />
          <div className="flex items-center gap-2 text-muted-foreground/70 text-xs">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline font-medium">Secure Checkout</span>
          </div>
        </div>
      </div>
    </header>
  );
}
