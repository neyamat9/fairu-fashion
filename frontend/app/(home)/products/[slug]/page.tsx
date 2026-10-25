import ProductDetailClient from "@/components/product/ProductDetailClient";
import { getQuestions, getReviews } from "@/lib/services/reviews.service";
import { getProductBySlug as fetchProduct, getRelatedProducts } from "@/lib/services/products.service";
import { getSiteSettings } from "@/lib/services/site.service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

// the title/description and the page itself both need the product: fetch it once per request
const getProductBySlug = cache(fetchProduct);

export const revalidate = 300;

// no pages are built ahead of time; each one is built on its first visit and then kept (and refreshed every 5 minutes)
export function generateStaticParams() {
  return [];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found — Fairu Fashion",
    };
  }

  const primaryImage =
    product.images.find((img) => img.isPrimary) ?? product.images[0];

  return {
    title: `${product.name} — Fairu Fashion`,
    description: product.shortDescription || product.description.replace(/<[^>]*>/g, "").slice(0, 160),
    openGraph: {
      title: `${product.name} — Fairu Fashion`,
      description: product.shortDescription || product.description.replace(/<[^>]*>/g, "").slice(0, 160),
      images: primaryImage
        ? [
            {
              url: primaryImage.url,
              width: 800,
              height: 800,
              alt: primaryImage.alt,
            },
          ]
        : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} — Fairu Fashion`,
      description: product.shortDescription || product.description.replace(/<[^>]*>/g, "").slice(0, 160),
      images: primaryImage ? [primaryImage.url] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // related products and store settings only need the slug: fetch them alongside the product itself
  const relatedPromise = getRelatedProducts(slug, 8);
  const settingsPromise = getSiteSettings();
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, reviewPage, questions, settings] = await Promise.all([
    relatedPromise,
    getReviews(product.id, 1, 10).catch(() => ({ reviews: [], total: 0, averageRating: 0, breakdown: {}, totalPages: 1 })),
    getQuestions(product.id).catch(() => []),
    settingsPromise,
  ]);
  const paymentMethods = settings.payment.methods.map((m) => (m === "BKASH" ? "bKash" : "Cash on Delivery"));

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
      reviews={reviewPage.reviews}
      reviewStats={{ average: reviewPage.averageRating, total: reviewPage.total, breakdown: reviewPage.breakdown }}
      questions={questions}
      paymentMethods={paymentMethods}
    />
  );
}
