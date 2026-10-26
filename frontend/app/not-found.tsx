import SiteFooter from "@/components/layout/SiteFooter";
import LuxuryHeader from "@/components/layout/LuxuryHeader";
import { BrowseProvider } from "@/components/browse/BrowseModals";
import NotFoundView from "@/components/layout/NotFoundView";
import { getShopCategories } from "@/lib/services/categories.service";
import { getBrands } from "@/lib/services/brands.service";
import { getSiteSettings } from "@/lib/services/site.service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "The page you're looking for doesn't exist. Navigate back to Fairu Fashion.",
};

export default async function GlobalNotFound() {
  const [categories, settings, allBrands] = await Promise.all([
    getShopCategories(),
    getSiteSettings(),
    getBrands(),
  ]);
  const brands = allBrands.filter((b) => b.productCount > 0);

  return (
    <BrowseProvider categories={categories} brands={brands}>
      <div className="min-h-screen flex flex-col bg-background">
        <LuxuryHeader categories={categories} />
        <main className="flex-1 flex flex-col">
          <NotFoundView />
        </main>
        <SiteFooter settings={settings} categories={categories} />
      </div>
    </BrowseProvider>
  );
}
