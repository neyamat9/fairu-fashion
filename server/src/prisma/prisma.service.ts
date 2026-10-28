import 'dotenv/config';
import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    let url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set. Check your .env file.');
    }
    url = url.replace(/&channel_binding=[^&]*/, '');
    url = url.replace(/\?channel_binding=[^&]*&?/, '?');

    const pool = new Pool({
      connectionString: url,

      max: 20,
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,

      keepAlive: false,

      statement_timeout: 30000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database disconnected');
  }
}
