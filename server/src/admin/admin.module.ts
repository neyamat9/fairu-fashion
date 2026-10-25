import { Module } from '@nestjs/common';
import { BrandModule } from './brand/brand.module';
import { CategoryModule } from './category/category.module';
import { SubCategoryModule } from './sub-category/sub-category.module';
import { ProductModule } from './product/product.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminOrdersModule } from './orders/orders.module';
import { AdminUsersModule } from './users/users.module';
import { AdminCouponsModule } from './coupons/coupons.module';
import { AdminBannersModule } from './banners/banners.module';
import { AdminFlashDealsModule } from './flash-deals/flash-deals.module';
import { AdminReturnsModule } from './returns/returns.module';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminSettingsModule } from './settings/settings.module';
import { AdminNewsletterModule } from './newsletter/newsletter.module';
import { AdminContactMessagesModule } from './contact-messages/contact-messages.module';
import { AdminSupportTicketsModule } from './support-tickets/support-tickets.module';
import { AdminActivityLogsModule } from './activity-logs/activity-logs.module';
import { AdminMediaModule } from './media/media.module';
import { AdminInventoryModule } from './inventory/inventory.module';
import { AdminReviewsModule } from './reviews/reviews.module';
import { AdminNotificationsModule } from './notifications/admin-notifications.module';
import { AdminBackInStockModule } from './back-in-stock/back-in-stock.module';
import { AdminReportsModule } from './reports/reports.module';
import { AdminAuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [
    BrandModule,
    CategoryModule,
    SubCategoryModule,
    ProductModule,
    DashboardModule,
    AdminOrdersModule,
    AdminUsersModule,
    AdminCouponsModule,
    AdminBannersModule,
    AdminFlashDealsModule,
    AdminReturnsModule,
    AdminAuthModule,
    AdminSettingsModule,
    AdminNewsletterModule,
    AdminContactMessagesModule,
    AdminSupportTicketsModule,
    AdminActivityLogsModule,
    AdminMediaModule,
    AdminInventoryModule,
    AdminReviewsModule,
    AdminNotificationsModule,
    AdminAuditLogsModule,
    AdminReportsModule,
    AdminBackInStockModule,
  ],
  exports: [
    BrandModule,
    CategoryModule,
    SubCategoryModule,
    ProductModule,
    DashboardModule,
    AdminOrdersModule,
    AdminUsersModule,
    AdminCouponsModule,
    AdminBannersModule,
    AdminFlashDealsModule,
    AdminReturnsModule,
  ],
})
export class AdminModule {}
