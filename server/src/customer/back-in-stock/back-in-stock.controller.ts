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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerBackInStockService } from './back-in-stock.service';
import {
  CancelBackInStockDto,
  SubscribeBackInStockDto,
} from './back-in-stock.dto';

@ApiTags('Customer - Back in stock')
@Controller('customer/back-in-stock')
export class CustomerBackInStockController {
  constructor(private readonly service: CustomerBackInStockService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 30 } })
  @ApiOperation({
    summary:
      'Ask to be emailed when an out-of-stock product (or option) is available again. Guests give an email.',
  })
  subscribe(@Body() dto: SubscribeBackInStockDto, @CurrentUser() user?: User) {
    return this.service.subscribe(dto, user);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 20 } })
  @ApiOperation({
    summary: 'Cancel an alert with the token from the email link',
  })
  cancel(@Body() dto: CancelBackInStockDto) {
    return this.service.cancelByToken(dto.token);
  }

  @Get('mine')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'My waiting alerts' })
  mine(@CurrentUser() user: User) {
    return this.service.mine(user);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel one of my alerts' })
  cancelMine(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.cancelMine(user, id);
  }
}
