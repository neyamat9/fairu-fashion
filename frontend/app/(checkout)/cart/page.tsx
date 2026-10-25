"use client";

import CartItem from "@/components/cart/CartItem";
import { CartListSkeleton } from "@/components/skeletons/CheckoutSkeletons";
import { useCart } from "@/lib/hooks/use-cart";
import { useCheckoutEntry } from "@/lib/hooks/use-checkout-entry";
import Link from "next/link";


export default function CartPage() {
  const { cart, cartCount, cartTotal, clearCart, loading } = useCart();
  const checkout = useCheckoutEntry();

  const formattedSubtotal = new Intl.NumberFormat("en-BD").format(cartTotal);
  const formattedTotal = formattedSubtotal;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-foreground font-outfit tracking-tight">
          Your Cart
          {cartCount > 0 && (
            <span className="ml-3 text-lg font-semibold text-muted-foreground/70">
              ({cartCount} {cartCount === 1 ? "item" : "items"})
            </span>
          )}
        </h1>
        <div className="mt-2 h-1 w-16 bg-brand-orange rounded" />
      </div>

      {loading ? (
        <CartListSkeleton />
      ) : cart.items.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
          <div className="w-24 h-24 rounded bg-muted border border-border flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-orange)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground font-outfit">
              Your cart is empty
            </p>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Looks like you haven&apos;t added anything yet. Browse our
              collection and find something you love.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-white font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* ── Left: Cart items ── */}
          <div className="space-y-4">
            {/* Column headers — desktop only */}
            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 pb-2 border-b border-border text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
              <span>Product</span>
              <span className="text-center w-28">Quantity</span>
              <span className="text-right w-24">Unit Price</span>
              <span className="text-right w-24">Total</span>
            </div>

            {/* Item list */}
            <div className="space-y-3">
              {cart.items.map((item) => (
                <CartItem key={item.id} item={item} variant="full" />
              ))}
            </div>

            {/* Cart actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Continue Shopping
              </Link>

              <button
                onClick={() => clearCart()}
                className="text-sm text-muted-foreground/70 hover:text-red-400 transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>

          {/* ── Right: Order summary ── */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded bg-muted border border-border p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground font-outfit">
                Order Summary
              </h2>

              {/* Item breakdown */}
              <div className="space-y-2">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground line-clamp-1 flex-1 mr-2">
                      {item.name}
                      {item.variantLabel && (
                        <span className="text-muted-foreground/70">
                          {" "}
                          · {item.variantLabel}
                        </span>
                      )}
                      <span className="text-muted-foreground/70"> × {item.quantity}</span>
                    </span>
                    <span className="text-foreground/80 flex-shrink-0">
                      ৳
                      {new Intl.NumberFormat("en-BD").format(
                        item.price * item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                {/* Subtotal */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">৳{formattedSubtotal}</span>
                </div>

                <p className="text-xs text-muted-foreground/70">
                  Shipping and any coupon are worked out at checkout, once we know where to deliver.
                </p>
              </div>

              {/* Grand total */}
              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-foreground font-bold font-outfit text-lg">
                  Subtotal
                </span>
                <span className="text-accent-text font-black text-2xl font-outfit">
                  ৳{formattedTotal}
                </span>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={checkout.go}
                disabled={checkout.state === "loading" || checkout.checking}
                className="w-full py-4 rounded bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.97] transition-all shadow-[0_8px_24px_rgba(249,155,16,0.3)] hover:shadow-[0_12px_32px_rgba(249,155,16,0.4)] disabled:cursor-wait disabled:opacity-80"
              >
                {checkout.checking ? "Checking your addresses…" : checkout.state === "signed-out" ? "Log in to checkout" : "Proceed to Checkout"}
              </button>
              {checkout.state === "signed-out" && <p className="text-center text-xs text-muted-foreground">Sign in or create an account to place your order.</p>}

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-muted-foreground/70 text-xs">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Secure
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground/70 text-xs">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Protected
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground/70 text-xs">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
