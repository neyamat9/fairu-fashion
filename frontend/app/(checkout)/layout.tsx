import CheckoutHeader from "@/components/checkout/CheckoutHeader";
import NavigationGate from "@/components/layout/NavigationGate";

/**
 * Checkout group layout — simplified header (logo, back to cart, secure label),
 * no CategoryNav or footer to keep the user focused on the checkout flow.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CheckoutHeader />

      {/* Page content */}
      <main className="flex-1">
        <NavigationGate>{children}</NavigationGate>
      </main>
    </div>
  );
}
