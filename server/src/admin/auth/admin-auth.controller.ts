import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { PasswordResetService } from '../../customer/auth/password-reset.service';
import { AdminAccountService } from './admin-account.service';
import {
  AdminChangePasswordDto,
  AdminForgotPasswordDto,
  AdminLoginDto,
  AdminRefreshDto,
  AdminResetPasswordDto,
  AdminUpdateProfileDto,
  SeedAdminDto,
} from './dto/admin-auth.dto';

@ApiTags('Admin - Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly account: AdminAccountService,
    private readonly passwordReset: PasswordResetService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login (email + password)' })
  login(@Body() dto: AdminLoginDto) {
    return this.account.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @Throttle({ medium: { ttl: 60000, limit: 30 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a new access token with the refresh token' })
  refresh(@Body() dto: AdminRefreshDto) {
    return this.account.refresh(dto.userId, dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out (invalidates the refresh token)' })
  logout(@CurrentUser() user: User) {
    return this.account.logout(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'The signed-in admin' })
  me(@CurrentUser() user: User) {
    return this.account.me(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Update my name / phone' })
  updateMe(@CurrentUser() user: User, @Body() dto: AdminUpdateProfileDto) {
    return this.account.updateProfile(user.id, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('JWT')
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Change my password (needs the current one). Signs out other sessions and returns fresh tokens.',
  })
  changePassword(
    @CurrentUser() user: User,
    @Body() dto: AdminChangePasswordDto,
  ) {
    return this.account.changePassword(
      user,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Email a password reset link to the admin account (always answers the same, whether or not the email exists)',
  })
  forgotPassword(@Body() dto: AdminForgotPasswordDto) {
    return this.passwordReset.requestReset(dto.email, { admin: true });
  }

  @Public()
  @Post('reset-password/verify')
  @Throttle({ medium: { ttl: 60000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check that a reset token is still valid' })
  verifyReset(@Body('token') token: string) {
    return this.passwordReset.verifyToken(String(token ?? ''), { admin: true });
  }

  @Public()
  @Post('reset-password')
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new admin password with the emailed token' })
  async resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.passwordReset.resetPassword(dto.token, dto.newPassword, {
      admin: true,
    });
  }

  // One-time bootstrap of the first admin. In production it is switched off
  // unless ADMIN_SEED_SECRET is set, and then that secret must be sent in the
  // x-seed-secret header — otherwise whoever reached a fresh server first
  // could make themselves the admin.
  @Public()
  @Post('seed-admin')
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Seed first admin (only works if no admin exists)' })
  async seedAdmin(
    @Body() dto: SeedAdminDto,
    @Headers('x-seed-secret') secret?: string,
  ) {
    const configured = this.config.get<string>('security.adminSeedSecret');
    const production = this.config.get<string>('app.nodeEnv') === 'production';
    if (production && !configured) {
      throw new NotFoundException();
    }
    if (configured && !safeEqual(secret ?? '', configured)) {
      throw new ForbiddenException('Invalid seed secret');
    }

    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
    });
    if (existingAdmin) {
      throw new ConflictException(
        'An admin user already exists. Cannot seed another.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        role: Role.SUPER_ADMIN,
        emailVerified: true,
      },
    });

    const session = await this.authService.login(user);
    return {
      userId: session.userId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: this.authService.toPublicUser(user),
    };
  }
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
