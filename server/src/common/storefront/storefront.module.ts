import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AdminStorefrontController } from './admin-storefront.controller';
import { ContentVersionController } from './content-version.controller';
import { StorefrontRevalidateInterceptor } from './storefront-revalidate.interceptor';
import { StorefrontSyncService } from './storefront-sync.service';

@Global()
@Module({
  controllers: [ContentVersionController, AdminStorefrontController],
  providers: [
    StorefrontSyncService,
    { provide: APP_INTERCEPTOR, useClass: StorefrontRevalidateInterceptor },
  ],
  exports: [StorefrontSyncService],
})
export class StorefrontModule {}
