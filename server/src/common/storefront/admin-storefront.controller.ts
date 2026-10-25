import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../decorators';
import { JwtAuthGuard, RolesGuard } from '../guards';
import { StorefrontSyncService } from './storefront-sync.service';

@ApiTags('Admin - Storefront sync')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/storefront')
export class AdminStorefrontController {
  constructor(private readonly sync: StorefrontSyncService) {}

  @Get('sync')
  @ApiOperation({
    summary:
      'When the storefront was last told about an admin change, and whether that worked',
  })
  status() {
    return this.sync.status();
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Ask the storefront to refresh everything now (retry)',
  })
  publish() {
    return this.sync.publishNow();
  }
}
