import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const incomingRequestId = request.headers['x-request-id'];
    const requestId = Array.isArray(incomingRequestId)
      ? incomingRequestId.join(',')
      : incomingRequestId || 'N/A';

    const now = Date.now();

    // Log incoming request
    this.logger.log(
      `↘️ Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent} - ID: ${requestId}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = response;
          const responseTime = Date.now() - now;

          // Log outgoing response
          this.logger.log(
            `↗️ Outgoing Response: ${method} ${url} - Status: ${statusCode} - ${responseTime}ms`,
          );
        },
        error: (error: unknown) => {
          const responseTime = Date.now() - now;
          const message =
            error instanceof Error ? error.message : String(error);

          // Log error response
          this.logger.error(
            `❌ Error Response: ${method} ${url} - ${message} - ${responseTime}ms`,
          );
        },
      }),
    );
  }
}
