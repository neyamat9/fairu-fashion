import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import RevealGroup from "@/components/motion/RevealGroup";
import SectionHeader from "./SectionHeader";
import SectionMore from "./SectionMore";

interface BestSellingProductsProps {
  products: Product[];
}

export default function BestSellingProducts({ products }: BestSellingProductsProps) {
  return (
    <section className="overflow-x-clip bg-secondary pb-16 pt-[60px] sm:pt-[58px] md:pb-20 md:pt-[71px]" aria-labelledby="best-selling-heading">
      <RevealGroup className="relative mx-auto max-w-[1440px] px-4 md:px-8">
        <span data-drift="1.4" className="pointer-events-none absolute right-0 top-2 hidden h-5 w-5 bg-brand-orange/60 md:block" aria-hidden="true" />
        <span data-drift="0.7" className="pointer-events-none absolute right-16 top-20 hidden h-3 w-3 bg-primary/30 md:block" aria-hidden="true" />
        <SectionHeader
          title={
            <span id="best-selling-heading">
              Crowd <span className="text-brand-orange">favourites</span>, better prices
            </span>
          }
          description="The dresses flying off our shelves right now. Grab yours before they sell out."
          href="/products"
          hrefLabel="See all bestsellers"
        />

        <div className="grid grid-cols-1 gap-4 [perspective:1100px] min-[480px]:grid-cols-2 min-[480px]:gap-3 md:gap-5 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} showSold entrance={false} />
          ))}
        </div>

        <SectionMore href="/products" label="See all bestsellers" />
      </RevealGroup>
    </section>
  );
}
