import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    // Skip transformation for GraphQL requests
    if (context.getType<string>() === 'graphql') {
      return next.handle();
    }

    const res = context.switchToHttp().getResponse<{
      getHeader?: (name: string) => unknown;
    }>();

    return next.handle().pipe(
      map((data) => {
        // Handlers that set their own non-JSON content type (e.g. the HTML
        // invoice) are sent as-is instead of being wrapped.
        const type = res?.getHeader?.('content-type');
        if (typeof type === 'string' && !type.includes('application/json')) {
          return data;
        }
        return {
          success: true,
          message:
            this.reflector.get<string>(
              RESPONSE_MESSAGE_KEY,
              context.getHandler(),
            ) || 'Operation successful',
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
