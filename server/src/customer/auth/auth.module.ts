import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { CartModule } from '../cart/cart.module';
import { RecentlyViewedModule } from '../recently-viewed/recently-viewed.module';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [AuthModule, PrismaModule, CartModule, RecentlyViewedModule],
  controllers: [AuthController],
  providers: [PasswordResetService],
})
export class CustomerAuthModule {}
