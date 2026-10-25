import {
  Body,
  Controller,
  Delete,
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
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { AdminBackInStockService } from './back-in-stock.service';
import {
  NotifyNowDto,
  RequestsListDto,
  WaitingListDto,
} from './back-in-stock.dto';

@ApiTags('Admin - Back in stock')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/back-in-stock')
export class AdminBackInStockController {
  constructor(private readonly service: AdminBackInStockService) {}

  @Get('summary')
  @ApiOperation({
    summary:
      'How many customers are waiting, for how many items, and how many can be alerted now',
  })
  summary() {
    return this.service.summary();
  }

  @Get()
  @ApiOperation({
    summary:
      'Items customers are waiting for, with the number waiting and current stock. inStockNow=true = ready to alert.',
  })
  waiting(@Query() q: WaitingListDto) {
    return this.service.waitingList(q);
  }

  @Get('requests')
  @ApiOperation({
    summary:
      'Individual requests (who is waiting, when, alerted or not, last error)',
  })
  requests(@Query() q: RequestsListDto) {
    return this.service.requests(q);
  }

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Send the back-in-stock alerts for one item now. (They also go out by themselves within a minute of restocking.)',
  })
  notify(@Body() dto: NotifyNowDto) {
    return this.service.notifyNow(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a request' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
