import BestSellingProducts from "@/components/home/BestSellingProducts";
import BrandShowcase from "@/components/home/BrandShowcase";
import CategoryGrid from "@/components/home/CategoryGrid";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import HeroSection from "@/components/home/HeroSection";
import { getBrands } from "@/lib/services/brands.service";
import { getShopCategories } from "@/lib/services/categories.service";
import { getHomeData, getProductsByBrand } from "@/lib/services/products.service";
import type { Product } from "@/lib/types";
import { getBanners, getSiteSettings } from "@/lib/services/site.service";

export default async function HomePage() {
  const [categories, home, settings, heroMain, heroSide] = await Promise.all([
    getShopCategories(),
    getHomeData().catch(() => ({ featured: [], newArrivals: [], bestSellers: [], onSale: [] })),
    getSiteSettings(),
    getBanners("HERO_MAIN"),
    getBanners("HERO_SIDE"),
  ]);

  // every brand's products, fetched together so switching brands on the page is instant
  const brands = (await getBrands()).filter((b) => b.productCount > 0);
  const lists = await Promise.all(brands.map((b) => getProductsByBrand(b.slug).catch(() => [] as Product[])));
  const productsByBrand: Record<string, Product[]> = Object.fromEntries(brands.map((b, i) => [b.slug, lists[i]]));

  return (
    <>
      <HeroSection main={heroMain} side={heroSide} spotlight={home.featured} categories={categories} />
      <CategoryGrid categories={categories} />
      {home.featured.length > 0 && <FeaturedProducts products={home.featured.slice(0, 8)} />}
      {home.bestSellers.length > 0 && <BestSellingProducts products={home.bestSellers.slice(0, 8)} />}
      <BrandShowcase brands={brands} productsByBrand={productsByBrand} />
    </>
  );
}
