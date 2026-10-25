import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AdminNotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { addAdminNotification, FeedInput } from './admin-feed';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminFeedService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminFeedService.name);
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.purge(), 6 * 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // Never throws and is safe to call without awaiting: a failure to add a
  // bell item must not break the order / ticket that caused it.
  async notify(n: FeedInput) {
    try {
      await addAdminNotification(this.prisma, n);
    } catch (error) {
      this.logger.error(
        `Admin notification failed (${n.type}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // The item is done (the payment was verified, the order cancelled...), so
  // it should no longer show as unread.
  async resolve(type: AdminNotificationType, entityId: string) {
    try {
      await this.prisma.adminNotification.updateMany({
        where: { type, entityId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Admin notification resolve failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Read items go after 60 days, everything after 180.
  async purge() {
    try {
      const now = Date.now();
      await this.prisma.adminNotification.deleteMany({
        where: {
          OR: [
            { isRead: true, createdAt: { lt: new Date(now - 60 * DAY) } },
            { createdAt: { lt: new Date(now - 180 * DAY) } },
          ],
        },
      });
    } catch (error) {
      this.logger.error(
        `Admin notification purge failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
