"use client";

import { useCart } from "@/lib/hooks/use-cart";
import type { CartItem as CartItemType } from "@/lib/types";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CartItemProps {
  item: CartItemType;
  /**
   * "compact" (default) — used in the CartSidebar (narrow panel)
   * "full"              — used on the full /cart page (wider layout)
   */
  variant?: "compact" | "full";
}

/**
 * A single cart line item.
 *
 * Entrance: slides in from above + fades in
 * Exit:     slides out to the right + fades before the item is removed from state
 *
 * Supports two visual variants:
 *  - compact: used in the CartSidebar (narrow panel)
 *  - full: used on the /cart page (wider layout with column alignment)
 */
export default function CartItem({ item, variant = "compact" }: CartItemProps) {
  const { updateQuantity, removeFromCart } = useCart();

  // Controls the CSS exit animation before actual removal
  const [isRemoving, setIsRemoving] = useState(false);
  // Controls the entrance animation — fires once on mount
  const [hasEntered, setHasEntered] = useState(false);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger entrance animation on next tick so the initial hidden state renders first
    const id = requestAnimationFrame(() => setHasEntered(true));
    return () => {
      cancelAnimationFrame(id);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, []);

  function handleRemove() {
    setIsRemoving(true);
    // Wait for the slide-out animation (300ms) before removing from state
    removeTimerRef.current = setTimeout(async () => {
      const r = await removeFromCart(item.id);
      if (r.ok) toast.success(`${item.name} removed from cart`);
      else {
        setIsRemoving(false);
        toast.error(r.error ?? "Could not remove the item");
      }
    }, 300);
  }

  async function change(q: number) {
    const r = await updateQuantity(item.id, q);
    if (!r.ok) toast.error(r.error ?? "Could not change the quantity");
  }

  function handleDecrement() {
    if (item.quantity <= 1) return;
    void change(item.quantity - 1);
  }

  function handleIncrement() {
    if (item.quantity >= 99) return;
    if (item.quantity >= item.stock) {
      toast.info(`Only ${item.stock} in stock`);
      return;
    }
    void change(item.quantity + 1);
  }

  const formattedPrice = new Intl.NumberFormat("en-BD").format(item.price);
  const formattedTotal = new Intl.NumberFormat("en-BD").format(
    item.price * item.quantity
  );

  const animationClasses = [
    hasEntered && !isRemoving
      ? "opacity-100 translate-y-0"
      : isRemoving
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-y-3",
    "duration-300 ease-out",
  ]
    .filter(Boolean)
    .join(" ");

  /* ── Compact variant (CartSidebar) ── */
  if (variant === "compact") {
    return (
      <div
        className={`group flex gap-3.5 rounded border border-border bg-background p-3 shadow-sm transition-all hover:border-brand-orange/60 hover:shadow-md ${animationClasses}`}
        aria-label={`Cart item: ${item.name}`}
      >
        {/* Product image */}
        <Link href={`/products/${item.slug}`} className="relative h-[84px] w-[84px] flex-shrink-0 overflow-hidden rounded bg-secondary">
          <Image src={item.imageUrl} alt={item.name} fill sizes="84px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        </Link>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 font-outfit text-sm font-semibold leading-snug text-foreground">{item.name}</p>
            <button
              onClick={handleRemove}
              aria-label={`Remove ${item.name} from cart`}
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {item.variantLabel && <p className="mt-0.5 text-xs text-muted-foreground">{item.variantLabel}</p>}

          <div className="mt-auto flex items-end justify-between pt-2">
            {/* Stepper */}
            <div className="flex items-center overflow-hidden rounded border border-input bg-card">
              <button
                onClick={handleDecrement}
                disabled={item.quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 select-none text-center text-sm font-bold text-foreground">{item.quantity}</span>
              <button
                onClick={handleIncrement}
                disabled={item.quantity >= 99}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Price */}
            <div className="text-right leading-tight">
              <p className="font-outfit text-base font-extrabold text-primary dark:text-accent-text">৳{formattedTotal}</p>
              {item.quantity > 1 && <p className="text-[11px] text-muted-foreground">৳{formattedPrice} each</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Full variant (/cart page) ── */
  return (
    <div
      className={`flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4 items-start sm:items-center p-4 rounded bg-muted border border-border transition-all ${animationClasses}`}
      aria-label={`Cart item: ${item.name}`}
    >
      {/* Product info */}
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="relative w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-secondary">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm md:text-base font-semibold text-foreground leading-snug line-clamp-2 font-outfit">
            {item.name}
          </p>
          {item.variantLabel && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{item.variantLabel}</p>
          )}
          {/* Mobile: show price inline */}
          <p className="text-sm font-semibold text-accent-text mt-1 sm:hidden">
            ৳{formattedTotal}
          </p>
        </div>
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center gap-1 bg-secondary rounded overflow-hidden mt-3 sm:mt-0 w-28">
        <button
          onClick={handleDecrement}
          disabled={item.quantity <= 1}
          aria-label="Decrease quantity"
          className="w-9 h-9 flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none"
        >
          −
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-foreground select-none">
          {item.quantity}
        </span>
        <button
          onClick={handleIncrement}
          disabled={item.quantity >= 99}
          aria-label="Increase quantity"
          className="w-9 h-9 flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg leading-none"
        >
          +
        </button>
      </div>

      {/* Unit price — hidden on mobile */}
      <div className="hidden sm:block text-right w-24">
        <span className="text-sm text-muted-foreground">৳{formattedPrice}</span>
      </div>

      {/* Line total + remove */}
      <div className="hidden sm:flex flex-col items-end gap-1 w-24">
        <span className="text-base font-bold text-foreground">৳{formattedTotal}</span>
        <button
          onClick={handleRemove}
          aria-label={`Remove ${item.name} from cart`}
          className="text-xs text-muted-foreground/70 hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Mobile remove button */}
      <button
        onClick={handleRemove}
        aria-label={`Remove ${item.name} from cart`}
        className="sm:hidden text-xs text-muted-foreground/70 hover:text-red-400 transition-colors mt-2 self-end"
      >
        Remove
      </button>
    </div>
  );
}
