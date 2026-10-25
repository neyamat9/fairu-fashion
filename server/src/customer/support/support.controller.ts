import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import {
  CreateTicketDto,
  ListTicketsDto,
  TicketMessageDto,
} from './support.dto';

@ApiTags('Customer - Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/support-tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ medium: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary: 'Open a support ticket (optionally about one of my orders)',
  })
  create(@CurrentUser() user: User, @Body() dto: CreateTicketDto) {
    return this.support.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'My support tickets, most recently active first' })
  list(@CurrentUser() user: User, @Query() q: ListTicketsDto) {
    return this.support.list(user.id, q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A ticket with its full conversation' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.findOne(user.id, id);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ medium: { ttl: 60000, limit: 20 } })
  @ApiOperation({
    summary:
      'Reply on a ticket. Re-opens a resolved ticket; not allowed on a closed one.',
  })
  reply(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketMessageDto,
  ) {
    return this.support.reply(user.id, id, dto);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Close my ticket (final — open a new one if needed)',
  })
  close(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.support.close(user.id, id);
  }
}
