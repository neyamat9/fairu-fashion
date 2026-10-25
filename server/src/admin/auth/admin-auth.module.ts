import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAccountService } from './admin-account.service';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PasswordResetService } from '../../customer/auth/password-reset.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminAuthController],
  providers: [AdminAccountService, PasswordResetService],
})
export class AdminAuthModule {}
