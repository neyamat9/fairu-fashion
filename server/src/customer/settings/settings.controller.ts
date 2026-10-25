import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SettingsService } from '../../common/settings';
import {
  MOBILE_BANKING_METHODS,
  mobileAccount,
} from '../../common/settings/settings.types';
import { ShippingService } from '../shipping/shipping.service';

@ApiTags('Customer - Settings')
@Controller('customer/settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly shippingService: ShippingService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Public store settings: store info, payment options, shipping, return policy',
  })
  async getPublicSettings() {
    const [site, payment, returns, shipping] = await Promise.all([
      this.settings.get('site'),
      this.settings.get('payment'),
      this.settings.get('returns'),
      this.shippingService.getOptions(),
    ]);

    const paymentMethods: string[] = [];
    if (payment.codEnabled) paymentMethods.push('CASH_ON_DELIVERY');
    const accounts: Record<string, ReturnType<typeof mobileAccount>> = {};
    for (const m of MOBILE_BANKING_METHODS) {
      const acc = mobileAccount(payment, m);
      accounts[m.toLowerCase()] = acc;
      if (acc) paymentMethods.push(m);
    }

    return {
      site,
      payment: {
        methods: paymentMethods,
        // one entry per mobile-banking method: where to send the money
        ...accounts,
      },
      shipping,
      returns,
    };
  }
}
