import { BadRequestException } from '@nestjs/common';

export interface PricingInput {
  regularPrice: number;
  // The everyday price (what customers pay when no promotion is running)
  normalPrice: number;
  buyingPrice: number;
  discountPrice: number | null;
  discountStart: Date | null;
  discountEnd: Date | null;
}

export interface PricingResult {
  // Stored columns
  sellingPrice: number;
  priceBeforeDiscount: number | null;
  isDiscounted: boolean;
  profitMargin: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function isPromoActive(
  p: Pick<PricingInput, 'discountPrice' | 'discountStart' | 'discountEnd'>,
  now = new Date(),
) {
  if (p.discountPrice === null) return false;
  if (p.discountStart && p.discountStart > now) return false;
  if (p.discountEnd && p.discountEnd <= now) return false;
  return true;
}

// Checks the prices make sense together.
export function validatePricing(p: PricingInput, now = new Date()) {
  if (p.normalPrice > p.regularPrice) {
    throw new BadRequestException(
      'Selling price cannot be higher than the regular price (MRP)',
    );
  }
  if (p.discountPrice === null) {
    if (p.discountStart || p.discountEnd) {
      throw new BadRequestException(
        'Set a discountPrice together with discountStart / discountEnd',
      );
    }
    return;
  }
  if (p.discountPrice >= p.normalPrice) {
    throw new BadRequestException(
      'The discount price must be lower than the selling price',
    );
  }
  if (p.discountStart && p.discountEnd && p.discountEnd <= p.discountStart) {
    throw new BadRequestException('discountEnd must be after discountStart');
  }
  if (p.discountEnd && p.discountEnd <= now) {
    throw new BadRequestException('discountEnd must be in the future');
  }
}

// sellingPrice always holds the price the shop charges RIGHT NOW. While a
// promotion runs, the normal price is kept in priceBeforeDiscount.
export function computePricing(
  p: PricingInput,
  now = new Date(),
): PricingResult {
  const active = isPromoActive(p, now);
  const sellingPrice = active ? (p.discountPrice as number) : p.normalPrice;
  return {
    sellingPrice,
    priceBeforeDiscount: active ? p.normalPrice : null,
    isDiscounted: sellingPrice < p.regularPrice,
    // margin on the normal price, so a short promotion does not distort it
    profitMargin:
      p.normalPrice > 0
        ? Math.max(
            -999.99,
            Math.min(
              999.99,
              round2(((p.normalPrice - p.buyingPrice) / p.normalPrice) * 100),
            ),
          )
        : null,
  };
}
