import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto, UnsubscribeDto } from './newsletter.dto';

@ApiTags('Customer - Newsletter')
@Controller('customer/newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post('subscribe')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'Subscribe an email to the newsletter (guests or logged in)',
  })
  async subscribe(@Body() dto: SubscribeDto, @CurrentUser() user?: User) {
    return this.newsletter.subscribe(dto.email, dto.source, user?.id);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Unsubscribe using the token from the email link' })
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.newsletter.unsubscribe(dto.token);
  }
}
