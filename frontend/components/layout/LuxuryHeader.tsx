"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  ShoppingBag,
  Menu,
  X,
  Clock,
  ArrowRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import BrandLogo from "@/components/layout/BrandLogo";
import MobileMenu from "@/components/layout/MobileMenu";
import { useCart } from "@/lib/hooks/use-cart";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAuthModal } from "@/components/auth/AuthModal";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import { useSearchHistory } from "@/lib/hooks/use-search-history";
import { searchProducts } from "@/lib/services/products.service";
import type { Category, Product } from "@/lib/types";

interface LuxuryHeaderProps {
  categories?: Category[];
}

export default function LuxuryHeader({ categories = [] }: LuxuryHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  const { cartCount, openCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { openAuth } = useAuthModal();

  // Scroll state: transparent on hero when scrollY <= 40, white frosted when scrolled down
  // Hide on scroll down, reveal on scroll up
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Search logic & autocomplete
  const { input: searchQuery, setInput: setSearchQuery, query: debouncedQuery } = useDebouncedSearch(300);
  const history = useSearchHistory();
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Monitor scroll for header background transition and scroll direction
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const delta = currentY - lastScrollY.current;

          if (currentY <= 40) {
            setScrolled(false);
            setVisible(true);
          } else {
            setScrolled(true);

            if (searchOpen || mobileMenuOpen) {
              setVisible(true);
            } else if (delta > 6 && currentY > 80) {
              // Scrolling down: hide header
              setVisible(false);
            } else if (delta < -4) {
              // Scrolling up: show header
              setVisible(true);
            }
          }

          lastScrollY.current = Math.max(0, currentY);
          ticking = false;
        });
        ticking = true;
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [searchOpen, mobileMenuOpen]);

  // Close search dropdown on route change
  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  // Focus search input when search is opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
      setSuggestions([]);
      setActiveSuggestion(-1);
    }
  }, [searchOpen, setSearchQuery]);

  // Fetch live autocomplete suggestions
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);

    searchProducts(q)
      .then((results) => {
        if (!cancelled) {
          setSuggestions(results.slice(0, 6));
          setActiveSuggestion(-1);
          setIsLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
          setIsLoadingSuggestions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close search dropdown on click outside or Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement)?.closest("[data-search-trigger]")
      ) {
        setSearchOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    };

    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      history.record(q);
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleSelectHistory = (term: string) => {
    history.record(term);
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSelectProduct = (product: Product) => {
    history.record(product.name);
    setSearchOpen(false);
    router.push(`/products/${product.slug}`);
  };

  // Determine styling based on scroll and page
  const isTransparent = isHome && !scrolled;

  return (
    <>
      {/* ============================================================ */}
      {/* 1. FIXED LUXURY HEADER (Seamless on wall -> White on scroll) */}
      {/* ============================================================ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out select-none ${
          visible ? "translate-y-0" : "-translate-y-full pointer-events-none"
        } ${
          isTransparent
            ? "bg-transparent border-b border-transparent py-5 sm:py-6"
            : "bg-white/95 dark:bg-[#1a1716]/95 backdrop-blur-md shadow-sm border-b border-border/40 py-3.5 sm:py-4"
        }`}
      >
        <div className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between">
          
          {/* Left: Previous Brand Logo & Site Name */}
          <div className="flex items-center">
            <BrandLogo size="md" />
          </div>

          {/* Center: Luxury Boutique Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-10 text-[13px] lg:text-[14px] font-medium tracking-wide">
            <Link
              href="/"
              className={`relative pb-1 font-semibold transition-colors ${
                isHome
                  ? "text-[#221C1A] dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#9E596B]"
                  : "text-[#4A423D] dark:text-neutral-300 hover:text-[#9E596B]"
              }`}
            >
              Home
            </Link>

            <div className="relative group/menu flex items-center gap-1 cursor-pointer text-[#4A423D] dark:text-neutral-300 hover:text-[#9E596B] transition-colors">
              <Link href="/shop">Shop</Link>
              <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover/menu:translate-y-0.5 transition-transform" />
            </div>

            <Link
              href="/search?q=new"
              className="text-[#4A423D] dark:text-neutral-300 hover:text-[#9E596B] transition-colors"
            >
              New Arrivals
            </Link>

            <div className="relative group/menu flex items-center gap-1 cursor-pointer text-[#4A423D] dark:text-neutral-300 hover:text-[#9E596B] transition-colors">
              <Link href="/category/three-piece">Collections</Link>
              <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover/menu:translate-y-0.5 transition-transform" />
            </div>

            <Link
              href="/contact"
              className="text-[#4A423D] dark:text-neutral-300 hover:text-[#9E596B] transition-colors"
            >
              About
            </Link>
          </nav>

          {/* Right: Actions (Search, User, Cart, Mobile Menu) */}
          <div className="flex items-center gap-4 sm:gap-6 text-[#2E2825] dark:text-neutral-200">
            {/* Search Trigger Icon */}
            <button
              type="button"
              data-search-trigger
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Open search"
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                searchOpen
                  ? "bg-[#9E596B] text-white"
                  : "hover:text-[#9E596B] hover:scale-105"
              }`}
            >
              <Search className="w-5 h-5 stroke-[1.8]" />
            </button>

            {/* User Account */}
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) openAuth("login");
                else router.push("/account");
              }}
              aria-label="Account"
              className="p-1 hover:text-[#9E596B] hover:scale-105 transition-all cursor-pointer"
            >
              <User className="w-5 h-5 stroke-[1.8]" />
            </button>

            {/* Shopping Cart with live count */}
            <button
              type="button"
              onClick={openCart}
              aria-label={`Shopping Bag (${cartCount} items)`}
              className="relative p-1 hover:text-[#9E596B] hover:scale-105 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
              <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#9E596B] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
                {cartCount}
              </span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              className="md:hidden p-1 hover:text-[#9E596B] transition-colors"
            >
              <Menu className="w-6 h-6 stroke-[1.8]" />
            </button>
          </div>

        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. SEARCH DROPDOWN OVERLAY (History + Live Autocomplete)     */}
      {/* ============================================================ */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            ref={searchDropdownRef}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[68px] sm:top-[76px] left-0 right-0 z-40 bg-white/98 dark:bg-[#1f1b19]/98 backdrop-blur-xl border-b border-border shadow-2xl"
          >
            <div className="w-full max-w-[840px] mx-auto px-5 py-6">
              {/* Search Input Form */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search three piece, kurtis, dresses, party wear…"
                  className="w-full h-13 pl-12 pr-24 rounded-lg border border-border bg-muted/40 dark:bg-muted/20 text-base font-medium placeholder:text-muted-foreground/70 focus:border-[#9E596B] focus:bg-background focus:outline-none focus:ring-4 focus:ring-[#9E596B]/15 transition-all"
                />
                <div className="absolute right-3 flex items-center gap-1.5">
                  {isLoadingSuggestions && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#9E596B]" />
                  )}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-md bg-[#9E596B] hover:bg-[#8A4959] text-white text-xs font-semibold tracking-wide transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Dropdown Body: History & Product Suggestions */}
              <div className="mt-4 pt-3 border-t border-border/50">
                
                {/* 1. Live Product Suggestions (when typing) */}
                {searchQuery.trim().length >= 2 ? (
                  <div>
                    <div className="flex items-center justify-between pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Matching Products ({suggestions.length})</span>
                    </div>

                    {suggestions.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {suggestions.map((product) => {
                          const primaryImg =
                            product.images.find((i) => i.isPrimary)?.url ||
                            product.images[0]?.url ||
                            "/placeholder.svg";
                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleSelectProduct(product)}
                              className="flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted/50 dark:hover:bg-muted/20 transition-colors group cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={primaryImg}
                                alt={product.name}
                                className="w-12 h-14 rounded object-cover bg-muted shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground group-hover:text-[#9E596B] transition-colors">
                                  {product.name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {product.categoryName} ·{" "}
                                  <span className="font-bold text-[#9E596B]">
                                    ৳{product.price.toLocaleString("en-BD")}
                                  </span>
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      !isLoadingSuggestions && (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No products found matching &ldquo;{searchQuery}&rdquo;
                        </p>
                      )
                    )}

                    {/* View All Results Button */}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-md bg-muted/50 hover:bg-muted text-xs font-bold text-[#9E596B] transition-colors cursor-pointer"
                    >
                      <span>See all results for &ldquo;{searchQuery.trim()}&rdquo;</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* 2. Recent Search History (when input is empty) */
                  <div>
                    {history.items.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Recent Searches</span>
                          <button
                            type="button"
                            onClick={() => history.clear()}
                            className="text-[11px] font-semibold text-[#9E596B] hover:underline cursor-pointer"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {history.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectHistory(item.term)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted hover:border-[#9E596B]/50 text-xs font-medium text-foreground transition-all cursor-pointer"
                            >
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>{item.term}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Popular Search Tags when no history yet */
                      <div>
                        <div className="pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Popular Searches</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {["Three Piece", "Embroidered Kurti", "Party Wear", "Floral Saree", "Modest Abaya"].map(
                            (tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleSelectHistory(tag)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted/30 hover:bg-muted text-xs font-medium text-foreground transition-all cursor-pointer"
                              >
                                <span>{tag}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Navigation */}
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
