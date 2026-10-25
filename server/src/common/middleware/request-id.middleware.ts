import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Generate a unique request ID or use existing one
    const requestId = req.headers['x-request-id'] || randomUUID();

    // Store the request ID in the request headers
    req.headers['x-request-id'] = requestId as string;

    // Add the request ID to the response headers
    res.setHeader('x-request-id', requestId);

    next();
  }
}
