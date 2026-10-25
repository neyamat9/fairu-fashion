import { mapOrder, mapProduct, statusLabel } from "../lib/api/mappers";

const card = {
  id: "p1", name: "Phone", slug: "phone", shortDescription: "A phone", price: 900, regularPrice: 1000, discountPercent: 10,
  inStock: true, stock: 3, isNew: true, isHot: false, isFeatured: false, isBestSeller: false, freeShipping: false, hasVariants: true,
  brand: { name: "Acme", slug: "acme" }, category: { name: "Phones", slug: "phones" }, image: "/uploads/a.webp", hoverImage: null,
};

describe("mapProduct", () => {
  it("maps a product card", () => {
    const p = mapProduct(card);
    expect(p.price).toBe(900);
    expect(p.originalPrice).toBe(1000);
    expect(p.discount).toBe(10);
    expect(p.badges).toEqual(["NEW"]);
    expect(p.hasVariants).toBe(true);
    expect(p.images[0].url).toMatch(/\/uploads\/a\.webp$/);
  });

  it("falls back to a placeholder when there is no image", () => {
    expect(mapProduct({ ...card, image: null }).images[0].url).toBe("/placeholder.svg");
  });

  it("never shows a 'was' price that is not higher", () => {
    expect(mapProduct({ ...card, regularPrice: 900 }).originalPrice).toBeUndefined();
  });

  it("turns a Color variant into a swatch and a mixed one into a pill", () => {
    const p = mapProduct({
      ...card, sellingPrice: "900", regularPrice: "1000", description: "<p>Hello</p><p>World</p>",
      variants: [
        { id: "v1", name: "Black", sku: "A", price: null, stock: 2, attribute1Name: "Color", attribute1Value: "Black" },
        { id: "v2", name: "Black / 128GB", sku: "B", price: "950", stock: 0, attribute1Name: "Color", attribute1Value: "Black", attribute2Name: "Storage", attribute2Value: "128GB" },
      ],
    });
    expect(p.variants[0].type).toBe("color");
    expect(p.variants[0].colorHex).toBe("#111111");
    expect(p.variants[0].price).toBe(900);
    expect(p.variants[1].type).toBe("size");
    expect(p.variants[1].price).toBe(950);
    expect(p.description).toBe("Hello\nWorld");
  });
});

describe("mapOrder", () => {
  it("maps statuses and flags what can still be cancelled", () => {
    expect(statusLabel("CONFIRMED")).toBe("Confirmed");
    expect(statusLabel("IN_TRANSIT")).toBe("In transit");
    expect(statusLabel("RETURNED")).toBe("Returned");
    expect(statusLabel("REFUNDED")).toBe("Refunded");
    expect(statusLabel("ON_HOLD")).toBe("On hold");
    expect(statusLabel("OUT_FOR_DELIVERY")).toBe("Out for delivery");
    const o = mapOrder({
      id: "o1", orderNumber: "RZ-1", status: "CONFIRMED", paymentMethod: "BKASH", paymentStatus: "PENDING", subtotal: "900", shippingCost: "60", total: "960",
      discountAmount: "0", paidAmount: "0", dueAmount: "960", placedAt: "2026-01-01T00:00:00Z", estimatedDelivery: null,
      items: [{ productId: "p", productSlug: "s", productName: "Phone", price: "900", quantity: 1, productImage: null, variantName: "Black" }],
      statusHistory: [{ toStatus: "CONFIRMED", createdAt: "2026-01-02T00:00:00Z" }, { toStatus: "PENDING", createdAt: "2026-01-01T00:00:00Z" }],
      shippingAddress: { fullName: "A", phone: "017", line1: "House 1", district: "Dhaka", upazila: "Banani", postalCode: "1213" },
    });
    expect(o.paymentMethod).toBe("bKash");
    expect(o.canCancel).toBe(true);
    expect(o.total).toBe(960);
    expect(o.statusHistory.map((h) => h.status)).toEqual(["Pending", "Confirmed"]);
    expect(o.shippingAddress.city).toBe("Banani, Dhaka");
  });
});
