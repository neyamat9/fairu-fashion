import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminNotificationsService } from './admin-notifications.service';
import { ListAdminNotificationsDto } from './admin-notifications.dto';

@ApiTags('Admin - Notifications (bell)')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly service: AdminNotificationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'The bell feed: new orders, bKash payments to verify, new tickets and replies, returns, low/out of stock, contact messages, questions. Newest first.',
  })
  list(@Query() q: ListAdminNotificationsDto) {
    return this.service.list(q);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of unread bell items (for the badge)' })
  unreadCount() {
    return this.service.unreadCount();
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'What needs attention right now: pending orders, bKash to verify, open tickets, returns, low/out-of-stock items, unanswered questions, new contact messages',
  })
  summary() {
    return this.service.summary();
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every item as read' })
  readAll(@CurrentUser() admin: User) {
    return this.service.markAllRead(admin.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one item as read' })
  read(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() admin: User) {
    return this.service.markRead(id, admin.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete one item' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
