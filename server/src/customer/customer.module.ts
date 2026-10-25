import { CustomerBackInStockModule } from './back-in-stock/back-in-stock.module';
import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { BannersModule } from './banners/banners.module';
import { BrandsModule } from './brands/brands.module';
import { CustomerAuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AddressesModule } from './addresses/addresses.module';
import { ShippingModule } from './shipping/shipping.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CustomerSettingsModule } from './settings/settings.module';
import { ReturnsModule } from './returns/returns.module';
import { CustomerNotificationsModule } from './notifications/notifications.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { ContactModule } from './contact/contact.module';
import { CustomerLocationsModule } from './locations/locations.module';
import { CustomerUploadsModule } from './uploads/uploads.module';
import { RecentlyViewedModule } from './recently-viewed/recently-viewed.module';
import { SearchHistoryModule } from './search-history/search-history.module';
import { SupportModule } from './support/support.module';

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    BannersModule,
    BrandsModule,
    CustomerAuthModule,
    CartModule,
    OrdersModule,
    WishlistModule,
    ReviewsModule,
    AddressesModule,
    ShippingModule,
    CheckoutModule,
    CustomerSettingsModule,
    ReturnsModule,
    CustomerNotificationsModule,
    NewsletterModule,
    CustomerBackInStockModule,
    ContactModule,
    CustomerLocationsModule,
    CustomerUploadsModule,
    RecentlyViewedModule,
    SearchHistoryModule,
    SupportModule,
  ],
  exports: [
    ProductsModule,
    CategoriesModule,
    BannersModule,
    BrandsModule,
    CustomerAuthModule,
    CartModule,
    OrdersModule,
    WishlistModule,
    ReviewsModule,
    AddressesModule,
    ShippingModule,
    CheckoutModule,
    CustomerSettingsModule,
    ReturnsModule,
  ],
})
export class CustomerModule {}
