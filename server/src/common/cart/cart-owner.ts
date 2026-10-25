import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Prisma, User } from '@prisma/client';

export const GUEST_TOKEN_HEADER = 'x-guest-token';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Who a cart belongs to: a logged-in customer, or a guest identified by the
// x-guest-token header (a random UUID the storefront keeps in localStorage).
export type CartOwner =
  | { userId: string; guestToken?: undefined }
  | { guestToken: string; userId?: undefined };

export function isValidGuestToken(token: unknown): token is string {
  return typeof token === 'string' && UUID_RE.test(token);
}

export function cartOwnerWhere(owner: CartOwner): Prisma.CartItemWhereInput {
  return owner.userId
    ? { userId: owner.userId }
    : { guestToken: owner.guestToken, userId: null };
}

export function readGuestToken(req: Request): string | undefined {
  const raw = req.headers[GUEST_TOKEN_HEADER];
  const token = Array.isArray(raw) ? raw[0] : raw;
  return token?.trim() || undefined;
}

// Resolves the cart owner. Use together with OptionalJwtAuthGuard.
// A logged-in user always wins over a guest token.
export const CurrentCartOwner = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CartOwner => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: User }>();
    if (req.user) return { userId: req.user.id };

    const token = readGuestToken(req);
    if (!isValidGuestToken(token)) {
      throw new BadRequestException(
        `Log in, or send a guest cart id in the "${GUEST_TOKEN_HEADER}" header (a UUID, e.g. from POST /customer/cart/guest-token).`,
      );
    }
    return { guestToken: token.toLowerCase() };
  },
);
