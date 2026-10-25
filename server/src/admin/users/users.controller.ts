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
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import type { Response } from 'express';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { sendTable } from '../../common/export/table-export';
import { AdminUsersService } from './users.service';
import {
  CreateNoteDto,
  ExportUsersDto,
  ListUsersDto,
  PageDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
} from './dto/users-admin.dto';

@ApiTags('Admin - Customers')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Customers: search, filter (status, registered between, ordered or not), sort (newest, spent, orders, last login). role=ADMIN lists admins.',
  })
  findAll(@Query() q: ListUsersDto) {
    return this.users.findAll(q);
  }

  @Get('export')
  @ApiOperation({
    summary:
      'Download customers (same filters as the list) as CSV or Excel: contact, orders, lifetime value, last order',
  })
  async export(@Query() q: ExportUsersDto, @Res() res: Response) {
    await sendTable(res, q.format, await this.users.exportTable(q));
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Customer detail: profile, lifetime value, order and ticket counts, addresses, latest orders',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Get(':id/orders')
  @ApiOperation({ summary: 'All orders of a customer, newest first' })
  orders(@Param('id', ParseUUIDPipe) id: string, @Query() q: PageDto) {
    return this.users.orders(id, q);
  }

  @Get(':id/addresses')
  @ApiOperation({ summary: 'Saved addresses of a customer' })
  addresses(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.addresses(id);
  }

  @Get(':id/tickets')
  @ApiOperation({ summary: 'Support tickets of a customer' })
  tickets(@Param('id', ParseUUIDPipe) id: string, @Query() q: PageDto) {
    return this.users.tickets(id, q);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Reviews written by a customer' })
  reviews(@Param('id', ParseUUIDPipe) id: string, @Query() q: PageDto) {
    return this.users.reviews(id, q);
  }

  @Get(':id/coupons')
  @ApiOperation({ summary: 'Coupons a customer has used' })
  coupons(@Param('id', ParseUUIDPipe) id: string, @Query() q: PageDto) {
    return this.users.couponUsage(id, q);
  }

  @Get(':id/notes')
  @ApiOperation({
    summary:
      'Private admin notes about a customer (never shown to the customer)',
  })
  notes(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.notes(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a private note about a customer' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() admin: User,
  ) {
    return this.users.addNote(id, dto.note, admin.id);
  }

  @Delete(':id/notes/:noteId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a note' })
  removeNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    return this.users.removeNote(id, noteId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Set ACTIVE / SUSPENDED / BANNED. A blocked customer is signed out. You cannot change your own account.',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: User,
  ) {
    return this.users.updateStatus(id, dto.status, admin);
  }

  @Patch(':id/role')
  @ApiOperation({
    summary:
      'Change a role. Granting or removing admin access needs a super admin.',
  })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() admin: User,
  ) {
    return this.users.updateRole(id, dto.role, admin);
  }
}
