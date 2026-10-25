import { AdminNotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

export interface FeedInput {
  type: AdminNotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  data?: Prisma.InputJsonValue;
}

// Adds an item to the admin bell. A plain function (no injection) so that
// stateless helpers inside transactions can use it too.
export function addAdminNotification(db: Db, n: FeedInput) {
  return db.adminNotification.create({
    data: {
      type: n.type,
      title: n.title.slice(0, 200),
      body: n.body.slice(0, 2000),
      entityType: n.entityType ?? null,
      entityId: n.entityId ?? null,
      data: n.data,
    },
  });
}
