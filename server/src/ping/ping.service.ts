import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

@Injectable()
export class PingService {
  private readonly logger = new Logger(PingService.name);

  constructor(private readonly prisma: PrismaService) {}

  ping() {
    return {
      success: true,
      message: 'Server is alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      hostname: os.hostname(),
    };
  }

  async checkDb() {
    try {
      // Execute a simple query to check connection
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        success: true,
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database connection failed', error);
      return {
        success: false,
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
