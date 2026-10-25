import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorefrontSyncService } from './storefront-sync.service';

@ApiTags('Customer - Content version')
@Controller('customer/content-version')
export class ContentVersionController {
  constructor(private readonly sync: StorefrontSyncService) {}

  @Get()
  @Header('Cache-Control', 'no-cache')
  @ApiOperation({
    summary:
      'A tiny version stamp that changes whenever the admin changes something the shop shows. Open pages poll it to know when to refresh.',
  })
  get() {
    return this.sync.snapshot();
  }
}
