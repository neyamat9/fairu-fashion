import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';

const ADMIN_ROLES: Role[] = [Role.ADMIN, Role.SUPER_ADMIN];
const PASSWORD_HISTORY = 5;

// After this many wrong passwords for one account, logins for it are paused.
const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;

@Injectable()
export class AdminAccountService {
  // email → failures; kept in memory (resets on restart, per server)
  private readonly failures = new Map<
    string,
    { count: number; until?: number }
  >();

  // A real argon2 hash of a random string: verifying against it takes as long
  // as a genuine check, so unknown emails cannot be told apart by timing.
  private readonly dummyHash = argon2.hash(randomBytes(16).toString('hex'));

  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
  ) {}

  isAdmin(user: Pick<User, 'role'>) {
    return ADMIN_ROLES.includes(user.role);
  }

  async login(email: string, password: string) {
    const key = email.trim().toLowerCase();
    this.assertNotLocked(key);

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: key, mode: 'insensitive' } },
    });

    // Always verify a password so the response time does not reveal whether
    // the email is an admin account.
    const ok = user
      ? await argon2.verify(user.passwordHash, password).catch(() => false)
      : await this.dummyHash
          .then((h) => argon2.verify(h, password))
          .catch(() => false);

    if (!user || !ok || !this.isAdmin(user)) {
      this.recordFailure(key);
      throw new UnauthorizedException('Invalid Credentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('This account has been suspended.');
    }

    this.failures.delete(key);
    const session = await this.auth.login(user);
    return {
      userId: session.userId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: this.auth.toPublicUser(user),
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !this.isAdmin(user))
      throw new ForbiddenException('Access Denied');
    return this.auth.refreshTokens(userId, refreshToken);
  }

  me(user: User) {
    return this.auth.toPublicUser(user);
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    if (data.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: data.phone, id: { not: userId } },
        select: { id: true },
      });
      if (taken)
        throw new ConflictException('This phone number is already in use');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    });
    return this.auth.toPublicUser(updated);
  }

  async changePassword(user: User, current: string, next: string) {
    if (!(await argon2.verify(user.passwordHash, current).catch(() => false))) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.assertNotReused(user, next);
    await this.setPassword(user, next);

    // The old refresh token is dead; hand back a fresh session so the
    // dashboard stays signed in.
    const fresh = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const session = await this.auth.login(fresh);
    return {
      success: true,
      message: 'Password changed. Other sessions have been signed out.',
      userId: session.userId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  }

  async logout(userId: string) {
    await this.auth.logout(userId);
    return { success: true };
  }

  // Used by the reset-password flow after the token was checked.
  async assertPasswordAllowed(userId: string, next: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertNotReused(user, next);
  }

  private async setPassword(user: User, next: string) {
    const passwordHash = await argon2.hash(next);
    await this.prisma.$transaction([
      this.prisma.passwordHistory.create({
        data: { userId: user.id, passwordHash: user.passwordHash },
      }),
      // Clearing the refresh token signs the account out everywhere.
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, refreshTokenHash: null },
      }),
    ]);
  }

  private async assertNotReused(user: User, next: string) {
    const recent = await this.prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: PASSWORD_HISTORY - 1,
    });
    for (const hash of [
      user.passwordHash,
      ...recent.map((r) => r.passwordHash),
    ]) {
      if (await argon2.verify(hash, next).catch(() => false)) {
        throw new BadRequestException(
          `Choose a password you have not used in your last ${PASSWORD_HISTORY} passwords`,
        );
      }
    }
  }

  private assertNotLocked(key: string) {
    const f = this.failures.get(key);
    if (f?.until && f.until > Date.now()) {
      throw new HttpException(
        'Too many failed attempts. Try again in a few minutes, or reset your password.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(key: string) {
    const f = this.failures.get(key) ?? { count: 0 };
    if (f.until && f.until <= Date.now()) {
      f.count = 0;
      f.until = undefined;
    }
    f.count++;
    if (f.count >= MAX_FAILURES) f.until = Date.now() + LOCK_MS;
    this.failures.set(key, f);
    if (this.failures.size > 5000) {
      for (const [k, v] of this.failures)
        if (!v.until || v.until < Date.now()) this.failures.delete(k);
    }
  }
}
