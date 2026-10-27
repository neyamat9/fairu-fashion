import { NestFactory, HttpAdapterHost, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from './common/filters';
import {
  LoggingInterceptor,
  TransformInterceptor,
} from './common/interceptors';
import { getLogLevels } from './config/logger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Get environment and set log levels accordingly
  const nodeEnv = process.env.NODE_ENV || 'development';
  const logLevels = getLogLevels(nodeEnv);

  // Create NestJS application with custom logger levels
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevels,
  });

  // Get ConfigService to access environment variables
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 8000;
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api';
  const corsOrigins = configService.get<string[]>('security.corsOrigins') ?? [
    'http://localhost:3000',
  ];
  const swaggerEnabled = configService.get<boolean>('swagger.enabled') ?? true;

  // Behind a reverse proxy / load balancer, TRUST_PROXY is the number of
  // proxies in front of the app (e.g. 1). Without it every visitor shares the
  // proxy's IP: rate limits are shared and the activity log shows the wrong IP.
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) {
    app.set(
      'trust proxy',
      /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true',
    );
  }

  // Apply Helmet - Secures HTTP headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`, 'http://localhost:8000'],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [
            `'self'`,
            'data:',
            'apollo-server-landing-page.cdn.apollographql.com',
          ],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          manifestSrc: [
            `'self'`,
            'apollo-server-landing-page.cdn.apollographql.com',
          ],
          frameSrc: [`'self'`, 'sandbox.embed.apollographql.com'],
        },
      },
    }),
  );

  // Enable CORS with custom origins
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-request-id',
      'x-guest-token',
    ],
  });

  // Serve uploaded files (review photos...). They are always re-encoded to
  // WebP by the upload service, under random names, so nothing user-supplied
  // is ever served as HTML/JS. The files must be loadable from the shop's own
  // origin, which helmet blocks by default (Cross-Origin-Resource-Policy).
  app.useStaticAssets(
    path.resolve(configService.get<string>('uploads.dir') ?? 'uploads'),
    {
      prefix: '/uploads/',
      index: false,
      dotfiles: 'ignore',
      redirect: false,
      maxAge: '30d',
      immutable: true,
      setHeaders: (res: import('http').ServerResponse) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
      },
    },
  );

  // Enable compression for responses
  app.use(compression());

  // ========== GLOBAL PIPES ==========
  // Enable validation globally with transformation and whitelist
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Automatically transform payloads to DTO instances
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted values are present
      transformOptions: {
        enableImplicitConversion: true, // Convert primitive types automatically
      },
    }),
  );

  // ========== GLOBAL FILTERS ==========
  // Apply global exception filter for consistent error handling
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // ========== GLOBAL INTERCEPTORS ==========
  // Apply logging interceptor to log all requests/responses
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Apply transform interceptor to wrap responses
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // ========== API PREFIX ==========
  // Set global prefix for all routes (e.g., /api/users instead of /users)
  app.setGlobalPrefix(apiPrefix);

  // ========== SWAGGER DOCUMENTATION ==========
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Fairu Fashion API')
      .setDescription(
        'The Fairu Fashion API documentation - High performance E-Commerce backend for women\'s fashion and dresses',
      )
      .setVersion('1.0')
      .addTag('Fairu Fashion')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
          description: 'API Key for authentication',
        },
        'api-key',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token (for future JWT authentication)',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Custom options for Swagger UI
    const customOptions = {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: 'Fairu Fashion API Documentation',
      customfavIcon: 'https://nestjs.com/img/logo-small.svg',
      customCss: '.swagger-ui .topbar { display: none }',
    };

    SwaggerModule.setup('docs', app, document, customOptions);
  }

  // ========== START SERVER ==========
  await app.listen(port, '0.0.0.0');

  // ========== STARTUP LOGS ==========
  logger.log(`🚀 Server is running on: http://localhost:${port}`);
  logger.log(`🚀 GraphQL is running on: http://localhost:${port}/graphql`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`📡 API Prefix: /${apiPrefix}`);

  if (swaggerEnabled) {
    logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/docs`,
    );
  }

  logger.log(`🎯 CORS allowed origins: ${corsOrigins.join(', ')}`);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
