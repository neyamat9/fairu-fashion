import { ShowcaseHero } from "@/components/hero2";
import CategoryGrid from "@/components/home/CategoryGrid";
import { CraftedForWomanSection } from "@/components/home/CraftedForWomanSection";
import NewArrivalsSection from "@/components/home/NewArrivalsSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import BestSellingProducts from "@/components/home/BestSellingProducts";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import { getShopCategories } from "@/lib/services/categories.service";
import { getHomeData } from "@/lib/services/products.service";
import { getSiteSettings } from "@/lib/services/site.service";

export default async function HomePage() {
  const [categories, home, settings] = await Promise.all([
    getShopCategories(),
    getHomeData().catch(() => ({
      featured: [],
      newArrivals: [],
      bestSellers: [],
      onSale: [],
    })),
    getSiteSettings(),
  ]);

  return (
    <>
      {/* 1. Hero Showcase with perfected architectural luxury layout */}
      <ShowcaseHero settings={settings} />

      {/* 2. Visual Category Grid */}
      <CategoryGrid categories={categories} />

      {/* 3. Expanding Accordion Gallery: "Crafted for the Elegant Woman" */}
      <CraftedForWomanSection settings={settings?.site?.craftedSection} />

      {/* 4. New Arrivals Showcase */}
      {home.newArrivals.length > 0 && (
        <NewArrivalsSection products={home.newArrivals} />
      )}

      {/* 5. Featured Products */}
      {home.featured.length > 0 && (
        <FeaturedProducts products={home.featured.slice(0, 8)} />
      )}

      {/* 6. Best Selling Products */}
      {home.bestSellers.length > 0 && (
        <BestSellingProducts products={home.bestSellers.slice(0, 8)} />
      )}

      {/* 7. Modern Animated Testimonials Section */}
      <TestimonialsSection />
    </>
  );
}
