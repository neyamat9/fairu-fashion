import CartSidebar from "@/components/cart/CartSidebar";
import FloatingCartBadge from "@/components/layout/FloatingCartBadge";
import { AuthModalProvider } from "@/components/auth/AuthModal";
import FreshnessWatcher from "@/components/layout/FreshnessWatcher";
import ScrollToTop from "@/components/motion/ScrollToTop";
import SmoothScroll from "@/components/motion/SmoothScroll";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/lib/context/AuthContext";
import { CartProvider } from "@/lib/context/CartContext";
import { WishlistProvider } from "@/lib/context/WishlistContext";
import type { Metadata } from "next";
import { Inter, Outfit, Lilita_One, Poppins, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const lilita = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: ["400"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});


export const metadata: Metadata = {
  title: {
    default: "Fairu Fashion – Elegant Women's Dresses & Wear",
    template: "%s | Fairu Fashion",
  },
  description:
    "Fairu Fashion – Elegance in Every Stitch. Shop premium women's dresses, party wear, ethnic kurtis, sarees, abayas and modern fashion with delivery across Bangladesh.",
  keywords: [
    "women dresses Bangladesh",
    "women fashion BD",
    "party wear dresses",
    "ethnic kurtis",
    "modest abayas",
    "sarees Bangladesh",
    "Fairu Fashion",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <noscript>
          <style>{"[data-reveal],[data-hero-item]{opacity:1!important}"}</style>
        </noscript>
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${lilita.variable} ${poppins.variable} ${playfair.variable} ${cormorant.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SmoothScroll />
          <ScrollToTop />
          <FreshnessWatcher />
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <AuthModalProvider>
                  {children}
                  {/* Global overlays — rendered once, visibility driven by context */}
                  <CartSidebar />
                  <FloatingCartBadge />
                </AuthModalProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
          <Toaster position="top-center" richColors expand={true} />
        </ThemeProvider>
      </body>
    </html>
  );
}
