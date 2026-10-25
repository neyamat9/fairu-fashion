import SiteFooter from "@/components/layout/SiteFooter";
import { BrowseProvider } from "@/components/browse/BrowseModals";
import NavigationGate from "@/components/layout/NavigationGate";
import SiteChrome from "@/components/layout/SiteChrome";
import { getShopCategories } from "@/lib/services/categories.service";
import { getBrands } from "@/lib/services/brands.service";
import { getSiteSettings } from "@/lib/services/site.service";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Fairu Fashion – Elegance in Every Stitch. Shop exquisite women's dresses, ethnic wear, party gowns and chic fashion with delivery across Bangladesh.",
};

// Shared server cache: the shop pages are rebuilt at most every 5 minutes (and at once when the admin changes something, see /api/revalidate).
export const revalidate = 300;

export default async function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [categories, settings, allBrands] = await Promise.all([getShopCategories(), getSiteSettings(), getBrands()]);
  const brands = allBrands.filter((b) => b.productCount > 0);

  return (
    <BrowseProvider categories={categories} brands={brands}>
      <div className="min-h-screen flex flex-col bg-background">
        <SiteChrome categories={categories} />
        <main className="flex-1">
            <NavigationGate>{children}</NavigationGate>
          </main>
        <SiteFooter settings={settings} categories={categories} />
      </div>
    </BrowseProvider>
  );
}
