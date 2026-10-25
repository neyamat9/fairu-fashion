import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

// Per-route limits use @Throttle({ <name>: { ttl, limit } }) where <name> is
// one of the throttlers below ("short", "medium", "long"). An override for a
// name that is not configured here (e.g. "default") is silently ignored.
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get('app.nodeEnv') === 'production';
        return {
          throttlers: [
            {
              name: 'short',
              ttl: seconds(10),
              limit: isProd ? 20 : 100,
            },
            {
              name: 'medium',
              ttl: seconds(60),
              limit: isProd ? 60 : 300,
            },
            {
              name: 'long',
              ttl: seconds(3600),
              limit: isProd ? 1000 : 5000,
            },
          ],
        };
      },
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class RateLimitingModule {}
