"use client";

import { useCartActions } from "@/lib/hooks/use-cart";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;

// One-click "add to cart" from cards and lists. Products with options
// (colour, storage…) send the customer to the product page to choose.
export function useQuickAdd() {
  const { addToCart } = useCartActions();
  const router = useRouter();

  return useCallback(
    async (p: { id: string; slug: string; name: string; price: number; stock: number; imageUrl: string; hasVariants?: boolean }, quantity = 1) => {
      if (p.hasVariants) {
        toast.info("Choose an option first", { description: p.name });
        router.push(`/products/${p.slug}`);
        return false;
      }
      if (p.stock <= 0) {
        toast.error(`${p.name} is out of stock`);
        return false;
      }
      const res = await addToCart({ productId: p.id, slug: p.slug, name: p.name, price: p.price, quantity, imageUrl: p.imageUrl, stock: p.stock });
      if (res.ok) {
        toast.success(`${p.name} added to cart`, { description: money(p.price), duration: 2500 });
      } else if (/variant|option/i.test(res.error ?? "")) {
        toast.info("Choose an option first", { description: p.name });
        router.push(`/products/${p.slug}`);
      } else {
        toast.error(res.error ?? "Could not add to cart");
      }
      return res.ok;
    },
    [addToCart, router],
  );
}
