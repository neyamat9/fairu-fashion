import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserInput } from './dto/create-user.input';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';
import { SignInInput } from './dto/sign-in.input';
import { JwtService } from '@nestjs/jwt';
import { AuthPayload } from './types/auth-payload.type';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registers a new user.
   */
  async registerUser(createUserInput: CreateUserInput): Promise<User> {
    const { password, name, phone } = createUserInput;
    // Emails are stored lower-case so "A@x.com" and "a@x.com" are one account.
    const email = createUserInput.email.trim().toLowerCase();

    const existingUserByEmail = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existingUserByEmail) {
      throw new ConflictException('Email is already registered');
    }

    if (phone) {
      const existingUserByPhone = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingUserByPhone) {
        throw new ConflictException(
          'Phone number is already associated with an account',
        );
      }
    }

    try {
      const passwordHash = await argon2.hash(password);

      const newUser = await this.prisma.user.create({
        data: {
          email,
          name,
          phone,
          passwordHash,
        },
      });

      return newUser;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        'Failed to register user: ' + message,
      );
    }
  }

  async validateLocalUser({ email, password }: SignInInput) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const passwordMatched = await argon2.verify(user.passwordHash, password);

    if (!passwordMatched)
      throw new UnauthorizedException('Invalid Credentials');

    // Checked after the password so the message is only shown to the owner.
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This account has been suspended. Please contact support.',
      );
    }

    return user;
  }

  async getTokens(userId: string) {
    const payload = { sub: userId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: '1h', // Access token expires quickly
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: '7d', // Refresh token lasts longer
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  // login
  async login(user: User): Promise<AuthPayload> {
    const tokens = await this.getTokens(user.id);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    return {
      userId: user.id,
      ...tokens,
      user,
    };
  }

  // logut
  async logout(userId: string) {
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        refreshTokenHash: { not: null },
      },
      data: { refreshTokenHash: null },
    });
    return true;
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshTokenHash || user.status !== 'ACTIVE') {
      throw new ForbiddenException('Access Denied');
    }

    const refreshTokenMatches = await argon2.verify(
      user.refreshTokenHash,
      refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.getTokens(user.id);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return tokens;
  }

  async validateJwtUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // A suspended / banned account stops working immediately, even with a
    // token that has not expired yet.
    if (!user || user.status !== 'ACTIVE') return null;
    return user;
  }

  // What may be sent to a browser: never the password hash, refresh-token
  // hash or other internal fields.
  toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    };
  }
}
