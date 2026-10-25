import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PingModule } from './ping/ping.module';
import { PrismaModule } from './prisma/prisma.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import configuration from './config/configuration';
import { RequestIdMiddleware } from './common/middleware';
import { ActivityModule, ActivityMiddleware } from './common/activity';
import { StorefrontModule } from './common/storefront/storefront.module';
import { Request, Response } from 'express';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { RateLimitingModule } from './common/rate-limiting/rate-limiting.module';
import { CacheModule } from './common/cache';
import { SettingsModule } from './common/settings';
import { MailModule } from './common/mail';
import { NotificationsModule } from './common/notifications';
import { InvoiceModule } from './common/invoice';
import { LocationsModule } from './common/locations';
import { UploadsModule } from './common/uploads';
import { InventoryModule } from './common/inventory';
import { AuditModule } from './common/audit';
import { DisplayOrderModule } from './common/display-order';
import { BackInStockModule } from './common/back-in-stock';
import { AdminFeedModule } from './common/admin-feed';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [
    // ConfigModule with custom configuration factory
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),

    // GraphQL with async configuration
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: true,
        debug: configService.get<string>('app.nodeEnv') === 'development',
        playground: false, // Must be false when using the LandingPage plugin below
        introspection: configService.get<boolean>('graphql.introspection'),
        csrfPrevention: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault()],
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
        }),
      }),
    }),

    RateLimitingModule,
    CacheModule,
    SettingsModule,
    MailModule,
    NotificationsModule,
    InvoiceModule,
    LocationsModule,
    UploadsModule,
    InventoryModule,
    AuditModule,
    DisplayOrderModule,
    BackInStockModule,
    AdminFeedModule,
    ActivityModule,
    StorefrontModule,
    PingModule,
    PrismaModule,
    AuthModule,
    AdminModule,
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply RequestIdMiddleware to all routes
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    // Records every action (who, what, result) once the response is done
    consumer.apply(ActivityMiddleware).forRoutes('*');
  }
}
