"use client";

import { useAuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCart } from "@/lib/hooks/use-cart";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import { useSearchHistory } from "@/lib/hooks/use-search-history";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { searchProducts } from "@/lib/services/products.service";
import type { Product } from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { startNavigation } from "@/components/layout/NavigationGate";
import BrandLogo from "@/components/layout/BrandLogo";
import MobileMenu from "@/components/layout/MobileMenu";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { Clock, Heart, Loader2, Menu, Search, ShoppingCart, User, X } from "lucide-react";

export default function SiteHeader() {
  const { cartCount, openCart } = useCart();
  const { vaultCount } = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const { openAuth } = useAuthModal();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // every search box uses useDebouncedSearch: typing stays instant, requests wait for a pause
  const { input: searchQuery, setInput: setSearchQuery, query: debouncedQuery } = useDebouncedSearch(300);
  const [prevCartCount, setPrevCartCount] = useState(cartCount);
  const [cartBadgeBounce, setCartBadgeBounce] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // recent searches of the signed-in customer, shown while the box is focused and empty
  const history = useSearchHistory();
  const [focused, setFocused] = useState(false);
  // true once the customer edits the box after clicking into it; until then the box may still hold the last search
  const [typed, setTyped] = useState(false);
  // Dropdowns open ONLY while the customer is in the box (focused): never by themselves after a page change or a finished fetch.
  const typedText = searchQuery.trim();
  const emptyBox = typedText.length < 2;
  // recent searches: all of them while the box is empty or still holds the last search; once the customer types, only the matching ones
  const historyRows = !typed || emptyBox ? history.items : history.items.filter((h) => h.term.toLowerCase().includes(typedText.toLowerCase()) && h.term.toLowerCase() !== typedText.toLowerCase());
  const showDropdown = focused && !emptyBox && suggestions.length > 0;
  const showHistory = focused && historyRows.length > 0;
  const suggestionCount = showDropdown ? suggestions.length : 0;
  const rowCount = suggestionCount + (showHistory ? historyRows.length : 0);
  const historyActive = activeSuggestion - suggestionCount; // index inside the history list, or negative


  // a page change always closes the dropdowns
  const pathname = usePathname();
  useEffect(() => {
    setFocused(false);
  }, [pathname]);

  // Bounce animation on cart count change
  useEffect(() => {
    if (cartCount !== prevCartCount && cartCount > 0) {
      setCartBadgeBounce(true);
      const t = setTimeout(() => setCartBadgeBounce(false), 350);
      setPrevCartCount(cartCount);
      return () => clearTimeout(t);
    }
    setPrevCartCount(cartCount);
  }, [cartCount, prevCartCount]);

  // Fetch autocomplete suggestions when debounced query changes
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setActiveSuggestion(-1);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setActiveSuggestion(-1);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      setActiveSuggestion(-1);
      setFocused(false);
      setTyped(false);
      history.record(q);
      startNavigation(`/search?q=${encodeURIComponent(q)}`);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  /** a past search was clicked: put it in the box and run it */
  function runHistory(term: string) {
    setSearchQuery(term);
    setFocused(false);
    setTyped(false);
    setActiveSuggestion(-1);
    history.record(term);
    inputRef.current?.blur();
    startNavigation(`/search?q=${encodeURIComponent(term)}`);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function handleSuggestionClick(product: Product) {
    // picking a product still counts as a search for what was typed
    history.record(searchQuery); // what was typed counts as the search; the box keeps it (not the product name)
    setFocused(false);
    setTyped(false);
    inputRef.current?.blur();
    setActiveSuggestion(-1);
    startNavigation(`/products/${product.slug}`);
    router.push(`/products/${product.slug}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setActiveSuggestion(-1);
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (rowCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((p) => (p < rowCount - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((p) => (p > 0 ? p - 1 : rowCount - 1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      if (activeSuggestion < suggestionCount) handleSuggestionClick(suggestions[activeSuggestion]);
      else runHistory(historyRows[activeSuggestion - suggestionCount].term);
    }
  }

  /** Highlight the matched portion of text with orange color */
  function highlightMatch(text: string, query: string) {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        <span>{text.slice(0, idx)}</span>
        <span className="font-bold text-accent-text">
          {text.slice(idx, idx + query.length)}
        </span>
        <span>{text.slice(idx + query.length)}</span>
      </>
    );
  }

  const actionBtn =
    "relative flex h-11 w-11 items-center justify-center rounded border border-border bg-card text-foreground transition-colors hover:border-brand-orange hover:text-accent-text";
  const badge =
    "absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded bg-brand-orange px-1 text-[10px] font-bold text-on-orange";

  return (
    <header className="relative z-[1010] border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 py-3 lg:flex-nowrap lg:gap-10 lg:py-4">
          {/* Brand Logo */}
          <div className="order-1 min-w-0 flex-shrink-0">
            <BrandLogo />
          </div>

          {/* Search Bar */}
          <div className="order-3 w-full lg:order-2 lg:w-auto lg:flex-1" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1.5">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  id="site-search"
                  type="text"
                  value={searchQuery}
                  onClick={() => setFocused(true)}
                  onChange={(e) => {
                    setFocused(true);
                    setTyped(true);
                    setActiveSuggestion(-1);
                    setSearchQuery(e.target.value);
                  }}
                  onFocus={() => {
                    setFocused(true);
                    setTyped(false);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search dresses, kurtis, sarees, party wear…"
                  autoComplete="off"
                  aria-label="Search products"
                  aria-autocomplete="list"
                  aria-controls={showDropdown ? "search-suggestions" : showHistory ? "search-history" : undefined}
                  aria-activedescendant={
                    activeSuggestion < 0 ? undefined : activeSuggestion < suggestionCount ? `suggestion-${activeSuggestion}` : `history-${activeSuggestion - suggestionCount}`
                  }
                  className="h-11 w-full rounded border border-input bg-secondary/60 pl-11 pr-14 text-sm font-medium text-foreground transition-all placeholder:text-muted-foreground focus:border-brand-orange focus:bg-card focus:outline-none focus:ring-4 focus:ring-brand-orange/15 md:h-12"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-1.5 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/90 md:h-9"
                >
                  {isLoadingSuggestions ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {/* One panel: product suggestions (when there is text) and the customer's recent searches */}
                {(showDropdown || showHistory) && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded border border-border bg-popover shadow-xl animate-scale-in">
                    {showDropdown && (
                      <div id="search-suggestions" role="listbox" aria-label="Search suggestions">
                    {suggestions.map((product, idx) => (
                      <button
                        key={product.id}
                        id={`suggestion-${idx}`}
                        role="option"
                        aria-selected={activeSuggestion === idx}
                        type="button"
                        onMouseDown={(e) => {
                          // Use mousedown to fire before onBlur closes dropdown
                          e.preventDefault();
                          handleSuggestionClick(product);
                        }}
                        onMouseEnter={() => setActiveSuggestion(idx)}
                        className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors ${
                          activeSuggestion === idx
                            ? "border-brand-orange bg-accent"
                            : "border-transparent hover:bg-secondary/60"
                        } ${idx !== 0 ? "border-t border-t-border" : ""}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url}
                          alt=""
                          aria-hidden="true"
                          className="h-10 w-10 flex-shrink-0 rounded bg-secondary object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {highlightMatch(product.name, debouncedQuery)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                            {product.categoryName} ·{" "}
                            <span className="font-bold text-accent-text">
                              ৳{product.price.toLocaleString("en-BD")}
                            </span>
                          </p>
                        </div>
                      </button>
                    ))}

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFocused(false);
                        history.record(searchQuery);
                        startNavigation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="flex w-full items-center justify-center gap-2 border-t border-border bg-secondary/60 px-4 py-3 text-xs font-bold text-primary transition-colors hover:bg-accent dark:text-accent-text"
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      See all results for &ldquo;{searchQuery.trim()}&rdquo;
                    </button>
                      </div>
                    )}
                    {showHistory && (
                  <div id="search-history" role="listbox" aria-label="Your recent searches" className={suggestionCount > 0 ? "border-t border-border" : ""}>
                    <div className="flex items-center justify-between px-4 pb-1 pt-3">
                      <span className="text-xs font-bold text-muted-foreground">Recent searches</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          history.clear();
                        }}
                        className="text-xs font-semibold text-accent-text hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    {historyRows.map((h, idx) => (
                      <div key={h.id} className={`flex items-center border-l-2 ${historyActive === idx ? "border-brand-orange bg-accent" : "border-transparent hover:bg-secondary/60"}`} onMouseEnter={() => setActiveSuggestion(suggestionCount + idx)}>
                        <button
                          id={`history-${idx}`}
                          role="option"
                          aria-selected={historyActive === idx}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            runHistory(h.term);
                          }}
                          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left"
                        >
                          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="truncate text-sm font-medium text-foreground">{h.term}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove “${h.term}” from your recent searches`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            history.remove(h.id);
                          }}
                          className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="order-2 ml-auto flex items-center gap-2 lg:order-3 lg:ml-0 lg:gap-3">
            <ThemeToggle className="!h-10 !w-10 max-sm:!hidden sm:!h-11 sm:!w-11" />

            <Link href="/wishlist" aria-label="Wishlist" className={`${actionBtn} hidden sm:flex`}>
              <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
              {vaultCount > 0 && <span className={badge}>{vaultCount > 9 ? "9+" : vaultCount}</span>}
            </Link>

            {isAuthenticated && user ? (
              <Link href="/account" aria-label={`Account: ${user.name}`} className={`${actionBtn} hidden sm:flex`}>
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded object-cover" />
                ) : (
                  <User className="h-[18px] w-[18px]" aria-hidden="true" />
                )}
              </Link>
            ) : (
              // signed out: sign in / sign up in a modal, right where the customer is
              <button type="button" aria-label="Sign in" onClick={() => openAuth("login")} className={`${actionBtn} hidden sm:flex`}>
                <User className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              aria-label={`Open cart, ${cartCount} items`}
              onClick={openCart}
              className="relative flex h-10 items-center gap-2 rounded bg-primary px-3 sm:h-11 sm:px-3.5 text-primary-foreground transition-colors hover:bg-primary/90 md:px-4"
            >
              <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="hidden text-sm font-semibold md:inline">Cart</span>
              {cartCount > 0 && (
                <span
                  className={`${badge} transition-transform ${cartBadgeBounce ? "scale-[1.35]" : "scale-100"}`}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {/* phones: everything that is an icon here on bigger screens lives in this menu */}
            <button
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className={`${actionBtn} !h-10 !w-10 sm:hidden`}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
