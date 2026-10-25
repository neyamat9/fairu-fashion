import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from '../../common/notifications';
import {
  ListNotificationsDto,
  UpdatePreferencesDto,
} from './dto/notifications.dto';

@ApiTags('Customer - Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List my notifications (newest first) with unread count',
  })
  async list(@CurrentUser() user: User, @Query() q: ListNotificationsDto) {
    return this.notifications.list(user.id, q);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread notification count (for the bell badge)' })
  async unreadCount(@CurrentUser() user: User) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Email / in-app preferences per notification type' })
  async getPreferences(@CurrentUser() user: User) {
    return this.notifications.getPreferences(user.id);
  }

  @Put('preferences')
  @ApiOperation({
    summary: 'Turn email / in-app notifications on or off per type',
  })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notifications.updatePreferences(user.id, dto.preferences);
  }

  // Declared before ':id/read' so "read-all" is not taken as an ID.
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: User) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markRead(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.markRead(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notifications.remove(user.id, id);
  }
}
