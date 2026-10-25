import AccountShell from "@/components/account/AccountShell";
import SiteFooter from "@/components/layout/SiteFooter";
import { BrowseProvider } from "@/components/browse/BrowseModals";
import NavigationGate from "@/components/layout/NavigationGate";
import SiteChrome from "@/components/layout/SiteChrome";
import { getShopCategories } from "@/lib/services/categories.service";
import { getBrands } from "@/lib/services/brands.service";
import { getSiteSettings } from "@/lib/services/site.service";
import type { Metadata } from "next";

export const revalidate = 300; // only the shop chrome is rendered here; the account pages load their own data in the browser

export const metadata: Metadata = {
  title: {
    template: "%s | Fairu Fashion",
    default: "Account | Fairu Fashion",
  },
  description: "Manage your Fairu Fashion account, orders, and wishlist.",
};

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [categories, settings, allBrands] = await Promise.all([getShopCategories(), getSiteSettings(), getBrands()]);
  const brands = allBrands.filter((b) => b.productCount > 0);
  return (
    <BrowseProvider categories={categories} brands={brands}>
      <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
        <SiteChrome categories={categories} />
        <main className="flex-1">
            {/* the account menu lives here, so it stays while the page next to it changes */}
            <AccountShell>
              <NavigationGate>{children}</NavigationGate>
            </AccountShell>
          </main>
        <SiteFooter settings={settings} categories={categories} />
      </div>
    </BrowseProvider>
  );
}
