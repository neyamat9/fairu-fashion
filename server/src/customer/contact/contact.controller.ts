import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContactService } from './contact.service';
import { ContactDto } from './contact.dto';

@ApiTags('Customer - Contact')
@Controller('customer/contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ medium: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Send a message from the contact form' })
  async submit(
    @Body() dto: ContactDto,
    @Req() req: Request,
    @CurrentUser() user?: User,
  ) {
    return this.contact.submit(dto, {
      userId: user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
