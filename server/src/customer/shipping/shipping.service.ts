import { Injectable } from '@nestjs/common';
import {
  SettingsService,
  ShippingSettings,
  ShippingZone,
} from '../../common/settings';

export interface ShippingQuote {
  // GLOBAL when the store uses one flat rate, otherwise the resolved zone.
  zone: ShippingZone | 'GLOBAL';
  zoneLabel: string;
  baseRate: number;
  // What the customer pays for shipping, after the free-shipping threshold.
  cost: number;
  isFree: boolean;
  freeShippingThreshold: number | null;
  // How much more the customer needs to add for free shipping (null if n/a).
  amountForFreeShipping: number | null;
  estimatedMinDays: number;
  estimatedMaxDays: number;
}

export interface ShippingInput {
  zone?: ShippingZone;
  city?: string;
  // True when every product in the cart is marked "free shipping".
  allItemsFreeShipping?: boolean;
}

const ZONE_LABELS: Record<ShippingZone | 'GLOBAL', string> = {
  GLOBAL: 'Standard Delivery',
  INSIDE_DHAKA: 'Inside Dhaka',
  OUTSIDE_DHAKA: 'Outside Dhaka',
};

@Injectable()
export class ShippingService {
  constructor(private settings: SettingsService) {}

  async getOptions() {
    const s = await this.settings.get('shipping');
    const options =
      s.mode === 'GLOBAL'
        ? [this.option('GLOBAL', s)]
        : [this.option('INSIDE_DHAKA', s), this.option('OUTSIDE_DHAKA', s)];

    return {
      mode: s.mode,
      freeShippingThreshold: s.freeShippingThreshold,
      insideDhakaCities: s.mode === 'ZONE' ? s.insideDhakaCities : [],
      options,
    };
  }

  async quote(
    subtotal: number,
    input: ShippingInput = {},
  ): Promise<ShippingQuote> {
    const s = await this.settings.get('shipping');
    const zone = s.mode === 'GLOBAL' ? 'GLOBAL' : this.resolveZone(s, input);
    const { rate, minDays, maxDays } = this.rateFor(zone, s);

    const threshold = s.freeShippingThreshold;
    const qualifiesForFree =
      !!input.allItemsFreeShipping ||
      (threshold !== null && subtotal >= threshold);
    const cost = qualifiesForFree ? 0 : rate;

    return {
      zone,
      zoneLabel: ZONE_LABELS[zone],
      baseRate: rate,
      cost,
      isFree: cost === 0,
      freeShippingThreshold: threshold,
      amountForFreeShipping:
        threshold !== null && !qualifiesForFree
          ? round2(threshold - subtotal)
          : null,
      estimatedMinDays: minDays,
      estimatedMaxDays: maxDays,
    };
  }

  // An explicit zone from the customer wins; otherwise infer it from the city.
  private resolveZone(s: ShippingSettings, input: ShippingInput): ShippingZone {
    if (input.zone) return input.zone;
    const city = input.city?.trim().toLowerCase();
    if (!city) return 'OUTSIDE_DHAKA';
    const inside = s.insideDhakaCities.some(
      (c) => c.trim().toLowerCase() === city,
    );
    return inside ? 'INSIDE_DHAKA' : 'OUTSIDE_DHAKA';
  }

  private rateFor(zone: ShippingZone | 'GLOBAL', s: ShippingSettings) {
    switch (zone) {
      case 'INSIDE_DHAKA':
        return {
          rate: s.insideDhakaRate,
          minDays: s.insideDhakaMinDays,
          maxDays: s.insideDhakaMaxDays,
        };
      case 'OUTSIDE_DHAKA':
        return {
          rate: s.outsideDhakaRate,
          minDays: s.outsideDhakaMinDays,
          maxDays: s.outsideDhakaMaxDays,
        };
      default:
        return {
          rate: s.globalRate,
          minDays: s.globalMinDays,
          maxDays: s.globalMaxDays,
        };
    }
  }

  private option(zone: ShippingZone | 'GLOBAL', s: ShippingSettings) {
    const { rate, minDays, maxDays } = this.rateFor(zone, s);
    return {
      zone,
      label: ZONE_LABELS[zone],
      rate,
      estimatedMinDays: minDays,
      estimatedMaxDays: maxDays,
    };
  }
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
