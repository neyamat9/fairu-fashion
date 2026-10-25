import SiteFooter from "@/components/layout/SiteFooter";
import { BrowseProvider } from "@/components/browse/BrowseModals";
import SiteChrome from "@/components/layout/SiteChrome";
import { getCategories } from "@/lib/services/categories.service";
import { getBrands } from "@/lib/services/brands.service";
import { getSiteSettings } from "@/lib/services/site.service";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "The page you're looking for doesn't exist. Navigate back to Fairu Fashion.",
};

export default async function NotFound() {
  const [categories, settings, allBrands] = await Promise.all([getCategories(), getSiteSettings(), getBrands()]);
  const brands = allBrands.filter((b) => b.productCount > 0);

  return (
    <BrowseProvider categories={categories} brands={brands}>
      <div className="min-h-screen flex flex-col bg-background">
        <SiteChrome categories={categories} />

        <main className="flex-1 flex items-center justify-center relative overflow-hidden py-24 px-4">
          {/* Background grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(var(--brand-orange) 1px, transparent 1px), linear-gradient(90deg, var(--brand-orange) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
            aria-hidden="true"
          />

          {/* Ambient glow blobs */}
          <div
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-orange/5 blur-[120px] rounded pointer-events-none animate-glow-pulse"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
            {/* 404 Heading */}
            <div className="relative mb-6 animate-fade-slide-up" style={{ animationDelay: "0ms" }}>
              {/* Glowing backdrop number */}
              <span
                className="absolute inset-0 flex items-center justify-center text-[220px] md:text-[280px] font-black text-accent-text/5 select-none pointer-events-none font-outfit leading-none"
                aria-hidden="true"
              >
                404
              </span>
              {/* Foreground number */}
              <h1 className="relative text-[120px] md:text-[160px] font-black text-foreground font-outfit leading-none tracking-tighter">
                <span className="text-accent-text">4</span>
                <span>0</span>
                <span className="text-accent-text">4</span>
              </h1>
            </div>

            {/* Status badge */}
            <div
              className="flex items-center gap-2 mb-6 animate-fade-slide-up"
              style={{ animationDelay: "80ms" }}
            >
              <div className="w-2 h-2 bg-red-500 rounded animate-pulse shadow-[0_0_8px_#EF4444]" aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/70">
                System Error · Route Not Found
              </span>
            </div>

            {/* Message */}
            <h2
              className="text-2xl md:text-3xl font-black text-foreground font-outfit uppercase tracking-tight mb-4 animate-fade-slide-up"
              style={{ animationDelay: "160ms" }}
            >
              Page Not Found
            </h2>
            <p
              className="text-muted-foreground/70 text-base md:text-lg font-medium leading-relaxed mb-12 max-w-md animate-fade-slide-up"
              style={{ animationDelay: "240ms" }}
            >
              The route you requested doesn&apos;t exist in our system. It may have been moved,
              deleted, or you may have followed a broken link.
            </p>

            {/* Navigation links */}
            <div
              className="flex flex-col sm:flex-row items-center gap-4 animate-fade-slide-up"
              style={{ animationDelay: "320ms" }}
            >
              {/* Primary — Home */}
              <Link
                href="/"
                className="group relative flex items-center gap-3 bg-gradient-to-br from-brand-orange to-brand-orange text-foreground font-bold px-8 py-4 rounded shadow-[0_8px_30px_rgba(249,155,16,0.35)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(249,155,16,0.45)] transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Return Home
              </Link>

              {/* Secondary — Products */}
              <Link
                href="/products"
                className="group flex items-center gap-3 bg-muted border border-border text-foreground font-bold px-8 py-4 rounded hover:bg-secondary hover:border-brand-orange/40 hover:-translate-y-1 transition-all"
              >
                <svg
                  className="w-5 h-5 text-muted-foreground group-hover:text-accent-text transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Browse Products
              </Link>
            </div>

            {/* Decorative divider */}
            <div
              className="flex items-center gap-4 mt-16 w-full max-w-xs animate-fade-slide-up"
              style={{ animationDelay: "400ms" }}
              aria-hidden="true"
            >
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-secondary" />
              <div className="w-1.5 h-1.5 bg-brand-orange rounded shadow-[0_0_8px_var(--brand-orange)]" />
              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-secondary" />
            </div>

            {/* Error code footer */}
            <p
              className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/70 animate-fade-slide-up"
              style={{ animationDelay: "480ms" }}
            >
              Error 404 · Page not found
            </p>
          </div>
        </main>

        <SiteFooter settings={settings} categories={categories} />
      </div>
    </BrowseProvider>
  );
}
