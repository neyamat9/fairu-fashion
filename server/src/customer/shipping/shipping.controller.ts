import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ShippingService } from './shipping.service';

@ApiTags('Customer - Shipping')
@Controller('customer/shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Get('options')
  @ApiOperation({
    summary:
      'Shipping options for checkout (one GLOBAL option, or INSIDE_DHAKA / OUTSIDE_DHAKA)',
  })
  async getOptions() {
    return this.shippingService.getOptions();
  }
}
