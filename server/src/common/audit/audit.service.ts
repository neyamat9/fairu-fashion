import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { currentRequestMeta } from '../activity/request-context';
import { sanitizeBounded } from '../activity/sanitize';

// Business changes the shop wants a trail of: who changed WHAT, from which
// value to which. (The activity log records every request; this records the
// meaningful before/after of prices, stock, order status, settings...)
export const AUDIT_ACTIONS = [
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'PRICE_CHANGED',
  'PRODUCT_STATUS_CHANGED',
  'STOCK_ADJUSTED',
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'ORDER_EDITED',
  'PAYMENT_RECORDED',
  'REFUND_RECORDED',
  'SETTINGS_UPDATED',
  'COUPON_CREATED',
  'COUPON_UPDATED',
  'COUPON_DELETED',
  'USER_STATUS_CHANGED',
  'USER_ROLE_CHANGED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Filter groups used by the dashboard
export const AUDIT_TYPES: Record<string, AuditAction[]> = {
  price: ['PRICE_CHANGED'],
  stock: ['STOCK_ADJUSTED'],
  'order-status': ['ORDER_STATUS_CHANGED'],
  orders: [
    'ORDER_CREATED',
    'ORDER_STATUS_CHANGED',
    'ORDER_EDITED',
    'PAYMENT_RECORDED',
    'REFUND_RECORDED',
  ],
  settings: ['SETTINGS_UPDATED'],
  products: [
    'PRODUCT_CREATED',
    'PRODUCT_UPDATED',
    'PRODUCT_DELETED',
    'PRICE_CHANGED',
    'PRODUCT_STATUS_CHANGED',
  ],
  coupons: ['COUPON_CREATED', 'COUPON_UPDATED', 'COUPON_DELETED'],
  customers: ['USER_STATUS_CHANGED', 'USER_ROLE_CHANGED'],
};

export interface AuditInput {
  adminId: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

type Db = PrismaService | Prisma.TransactionClient;

const toText = (v: unknown): string | null =>
  v === undefined || v === null ? null : JSON.stringify(sanitizeBounded(v));

// Writes one audit row on `db`. Pass the transaction of the change itself,
// so the change and its trail succeed or fail together.
export async function writeAudit(db: Db, e: AuditInput) {
  const meta = currentRequestMeta();
  await db.auditLog.create({
    data: {
      userId: e.adminId,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId ?? null,
      oldValue: toText(e.oldValue),
      newValue: toText(e.newValue),
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent?.slice(0, 300) ?? null,
    },
  });
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  record(db: Db, e: AuditInput) {
    return writeAudit(db, e);
  }

  // For changes made without a transaction: a failing trail must not undo
  // a change that already happened, so it is logged instead of thrown.
  async recordSafe(e: AuditInput, db: Db = this.prisma) {
    try {
      await writeAudit(db, e);
    } catch (error) {
      this.logger.error(
        `Audit write failed (${e.action}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
