"use client";

import BackInStockForm from "@/components/product/BackInStockForm";
import { useCart } from "@/lib/hooks/use-cart";
import { useCompare } from "@/lib/hooks/use-compare";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { playClick } from "@/lib/sound";
import type { Product, ProductVariant } from "@/lib/types";
import { ArrowRightLeft, Heart, Info, Landmark, Loader2, MessageSquare, Minus, Plus, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ProductSummaryProps {
  product: Product;
  /** Ref forwarded to the Add to Cart button — used by StickyATCBar's IntersectionObserver */
  atcRef?: React.RefObject<HTMLButtonElement | null>;
  onVariantChange?: (variant: ProductVariant | null) => void;
  /** Payment methods the shop accepts (from store settings) */
  paymentMethods?: string[];
}

const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;

const chip = "inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground";

export default function ProductSummary({ product, atcRef, onVariantChange, paymentMethods = ["Cash on Delivery"] }: ProductSummaryProps) {
  const { addToCart } = useCart();
  const { addToVault, removeFromVault, isInVault } = useWishlist();
  const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();

  const extra = product as Product & { avgRating?: number; reviewCount?: number; warranty?: string };
  const rating = extra.avgRating ?? 0;
  const reviewCount = extra.reviewCount ?? 0;

  const [variant, setVariant] = useState<ProductVariant | null>(product.variants[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"payment" | "disclaimer" | null>(null);

  const price = variant?.price ?? product.price;
  const oldPrice = variant?.originalPrice ?? product.originalPrice;
  const stock = variant?.stock ?? product.stock;
  const hasDiscount = !!oldPrice && oldPrice > price;
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const inVault = isInVault(product.id);
  const inCompare = isInCompare(product.id);

  useEffect(() => {
    onVariantChange?.(variant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(v: ProductVariant) {
    setVariant(v);
    setQuantity(1);
    onVariantChange?.(v);
  }

  async function add() {
    playClick();
    setBusy(true);
    const res = await addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price,
      variantId: variant?.id,
      variantLabel: variant?.label,
      quantity,
      imageUrl: image?.url ?? "/placeholder.svg",
      stock,
    });
    if (res.ok) toast.success(`${product.name} added to cart`, { description: `${quantity}× ${money(price)}`, duration: 2500 });
    else toast.error(res.error ?? "Could not add to cart");
    setBusy(false);
  }

  function toggleWish() {
    if (inVault) {
      removeFromVault(product.id);
      toast.info("Removed from wishlist");
    } else {
      addToVault({ productId: product.id, slug: product.slug, name: product.name, price: product.price, originalPrice: product.originalPrice, imageUrl: image?.url ?? "", stock: product.stock });
      toast.success("Added to wishlist", { duration: 2000 });
    }
  }

  function toggleCompare() {
    if (inCompare) return removeFromCompare(product.id);
    if (compareList.length >= 3) return void toast.warning("Maximum 3 products can be compared at once");
    addToCompare(product);
    toast.success(`${product.name} added to compare`, { duration: 2000 });
  }

  const colors = product.variants.filter((v) => v.type === "color");
  const others = product.variants.filter((v) => v.type !== "color");
  const stockText = stock <= 0 ? "Out of Stock" : stock < 5 ? `Only ${stock} left` : "In Stock";
  const stockTone = stock <= 0 ? "text-destructive" : stock < 5 ? "text-accent-text" : "text-emerald-600 dark:text-emerald-400";
  const bullets = product.pinnedSpecs.slice(0, 5).map((s) => `${s.label}: ${s.value}`);
  const emi12 = Math.ceil(price / 12);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="font-outfit text-xl font-extrabold leading-snug text-foreground sm:text-2xl">{product.name}</h1>

      {/* rating + helper chips */}
      <div className="flex flex-wrap items-center gap-2.5 text-sm">
        <span className="flex" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-[18px] w-[18px] ${n <= Math.round(rating) ? "fill-brand-orange text-brand-orange" : "fill-transparent text-muted-foreground/40"}`} />
          ))}
        </span>
        <span className="font-medium text-muted-foreground">
          {reviewCount > 0 ? (
            <>
              <b className="text-foreground">{rating.toFixed(1)}</b> · {reviewCount} {reviewCount === 1 ? "Review" : "Reviews"}
            </>
          ) : (
            "0 Reviews"
          )}
        </span>
        <button
          type="button"
          onClick={() => setPanel(panel === "disclaimer" ? null : "disclaimer")}
          className="inline-flex items-center gap-1.5 rounded border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 dark:border-brand-blue/40 dark:text-brand-blue"
        >
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          Disclaimer
        </button>
        <Link
          href="/contact"
          className="inline-flex items-center gap-1.5 rounded border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-600/15 dark:text-emerald-400"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
          Suggestion
        </Link>
      </div>
      {panel === "disclaimer" && (
        <p className="rounded border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Product photos are for illustration. Colours, packaging and minor specifications may vary slightly by batch. Every item is 100% genuine and
          carries the brand&apos;s warranty.
        </p>
      )}

      {/* facts */}
      <div className="flex flex-wrap gap-2">
        <span className={chip}>
          Stock : <b className={stockTone}>{stockText}</b>
        </span>
        {product.productCode && (
          <span className={chip}>
            PID : <b className="text-foreground">{variant?.sku || product.productCode}</b>
          </span>
        )}
        {product.brandName && (
          <span className={chip}>
            Brand :{" "}
            {product.brand ? (
              <Link href={`/brand/${product.brand}`} className="font-bold text-foreground hover:text-accent-text">
                {product.brandName}
              </Link>
            ) : (
              <b className="text-foreground">{product.brandName}</b>
            )}
          </span>
        )}
        {extra.warranty && (
          <span className={chip}>
            Warranty : <b className="text-foreground">{extra.warranty.replace(/ brand warranty$/i, "")}</b>
          </span>
        )}
      </div>

      {/* key features */}
      {(bullets.length > 0 || product.shortDescription) && (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-brand-orange">
          {bullets.length > 0 ? bullets.map((b) => <li key={b}>{b}</li>) : <li>{product.shortDescription}</li>}
        </ul>
      )}

      {/* options */}
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-muted-foreground">
            Color: <span className="text-foreground">{variant?.type === "color" ? variant.label.replace(/^Color:\s*/i, "") : ""}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v)}
                aria-label={`Select ${v.label}`}
                aria-pressed={variant?.id === v.id}
                title={v.label}
                className={`h-9 w-9 rounded border-2 transition-all ${variant?.id === v.id ? "border-brand-orange ring-2 ring-brand-orange/30" : "border-border hover:border-input"}`}
                style={{ backgroundColor: v.colorHex ?? "#888" }}
              />
            ))}
          </div>
        </div>
      )}
      {others.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold text-muted-foreground">{others[0].type === "storage" ? "Storage" : others[0].type === "ram" ? "RAM" : "Size"}</p>
          <div className="flex flex-wrap gap-2">
            {others.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v)}
                aria-pressed={variant?.id === v.id}
                className={`rounded border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  variant?.id === v.id ? "border-brand-orange bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-brand-orange"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* price + EMI */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">{hasDiscount ? "Discount Price" : "Price"}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-outfit text-2xl font-extrabold text-destructive">{money(price)}</span>
            {hasDiscount && <span className="text-sm text-muted-foreground line-through">{money(oldPrice!)}</span>}
          </p>
          <button
            type="button"
            onClick={() => setPanel(panel === "payment" ? null : "payment")}
            aria-expanded={panel === "payment"}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline dark:text-brand-blue"
          >
            <Plus className={`h-3.5 w-3.5 transition-transform ${panel === "payment" ? "rotate-45" : ""}`} aria-hidden="true" />
            Available Payment Method
          </button>
          {panel === "payment" && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {paymentMethods.map((m) => (
                <li key={m} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-brand-orange" aria-hidden="true" />
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* EMI is switched off for now — shown greyed out, to be enabled later */}
        <div className="relative cursor-not-allowed select-none rounded border border-dashed border-border bg-background/60 p-4 opacity-60" aria-disabled="true">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-muted-foreground">EMI Start From*</p>
            <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Coming soon</span>
          </div>
          <p className="mt-2 font-outfit text-2xl font-extrabold text-muted-foreground">{money(emi12)}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
            View Banks EMI Plans
          </span>
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-stretch gap-2.5">
        <div className="flex items-center rounded border border-input bg-background">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 select-none border-x border-input text-center text-sm font-bold leading-[2.75rem] text-foreground">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, stock, q + 1))}
            disabled={quantity >= 99 || quantity >= stock}
            aria-label="Increase quantity"
            className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          ref={atcRef}
          type="button"
          onClick={add}
          disabled={busy || stock <= 0}
          aria-label={`Add ${product.name} to cart`}
          className="flex h-11 min-w-[160px] flex-1 items-center justify-center gap-2 rounded bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          {stock <= 0 ? "Out of Stock" : "Add to Cart"}
        </button>

        <button
          type="button"
          onClick={toggleWish}
          aria-pressed={inVault}
          className={`flex h-11 items-center gap-2 rounded border px-4 text-sm font-semibold transition-colors ${
            inVault ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-secondary text-foreground hover:border-brand-orange"
          }`}
        >
          <Heart className="h-4 w-4" fill={inVault ? "currentColor" : "none"} />
          Wishlist
        </button>
        <button
          type="button"
          onClick={toggleCompare}
          aria-pressed={inCompare}
          className={`flex h-11 items-center gap-2 rounded border px-4 text-sm font-semibold transition-colors ${
            inCompare ? "border-brand-orange bg-brand-orange/15 text-accent-text" : "border-border bg-secondary text-foreground hover:border-brand-orange"
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Compare
        </button>
      </div>

      {stock <= 0 && <BackInStockForm productId={product.id} variantId={variant?.id} />}
    </div>
  );
}
