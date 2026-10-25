import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { User } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordResetService } from './password-reset.service';
import { CartService } from '../cart/cart.service';
import { RecentlyViewedService } from '../recently-viewed/recently-viewed.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Customer - Auth')
@Controller('customer/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly passwordResetService: PasswordResetService,
    private readonly cartService: CartService,
    private readonly recentlyViewed: RecentlyViewedService,
  ) {}

  private readonly logger = new Logger(AuthController.name);

  // The session returned to the browser, without internal user fields.
  private publicSession(session: Awaited<ReturnType<AuthService['login']>>) {
    return {
      userId: session.userId,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: session.user
        ? this.authService.toPublicUser(session.user as never)
        : undefined,
    };
  }

  // Best effort: a failed cart merge must never block logging in.
  private async mergeGuestCart(userId: string, guestToken?: string) {
    if (!guestToken) return;
    const token = guestToken.toLowerCase();
    for (const [what, run] of [
      ['cart', () => this.cartService.mergeGuestCart(userId, token)],
      ['recently viewed', () => this.recentlyViewed.mergeGuest(userId, token)],
    ] as const) {
      try {
        await run();
      } catch (error) {
        this.logger.warn(
          `Guest ${what} merge failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.registerUser(dto);
    await this.mergeGuestCart(user.id, dto.guestToken);
    return this.publicSession(await this.authService.login(user));
  }

  @Public()
  @Post('login')
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email & password' })
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateLocalUser(dto);
    await this.mergeGuestCart(user.id, dto.guestToken);
    return this.publicSession(await this.authService.login(user));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.authService.refreshTokens(
      dto.userId,
      dto.refreshToken,
    );
    return tokens;
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a password reset link to the email (always returns success)',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.passwordResetService.requestReset(dto.email);
  }

  @Public()
  @Get('reset-password/verify')
  @Throttle({ medium: { ttl: 60000, limit: 20 } })
  @ApiOperation({
    summary: 'Check if a reset token is still valid (for the reset page)',
  })
  async verifyResetToken(@Query('token') token: string) {
    return this.passwordResetService.verifyToken(token);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password using the token from the reset link',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordResetService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate refresh token)' })
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    const profile = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        occupation: true,
        dateOfBirth: true,
        gender: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        loyaltyPoints: true,
        totalOrders: true,
        totalSpent: true,
        createdAt: true,
        addresses: {
          orderBy: { isDefault: 'desc' },
          take: 10,
        },
      },
    });
    return profile;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        occupation: true,
      },
    });
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) {
      return { success: false, message: 'Current password is incorrect' };
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Password changed successfully' };
  }
}
