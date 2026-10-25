import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchHistoryService } from './search-history.service';

class RecordSearchDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  term: string;
}

@ApiTags('Customer - Search history')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/search-history')
export class SearchHistoryController {
  constructor(private readonly history: SearchHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'The latest 4 searches of the signed-in customer' })
  latest(@CurrentUser() user: User) {
    return this.history.latest(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { ttl: 60000, limit: 60 } })
  @ApiOperation({
    summary: 'Remember a search (moves it to the top if repeated)',
  })
  record(@CurrentUser() user: User, @Body() dto: RecordSearchDto) {
    return this.history.record(user.id, dto.term);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove one search from the history' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.history.remove(user.id, id);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear the whole search history' })
  clear(@CurrentUser() user: User) {
    return this.history.clear(user.id);
  }
}
