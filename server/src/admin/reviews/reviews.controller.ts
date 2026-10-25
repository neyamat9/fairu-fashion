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
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { AdminReviewsService } from './reviews.service';
import {
  AnswerQuestionDto,
  BulkReviewStatusDto,
  ListQuestionsDto,
  ListReviewsDto,
  SetReviewStatusDto,
} from './reviews.dto';

@ApiTags('Admin - Reviews & Questions')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminReviewsController {
  constructor(private readonly service: AdminReviewsService) {}

  @Get('reviews')
  @ApiOperation({
    summary:
      'Reviews of all products. Filter by status, rating, product, customer, text.',
  })
  list(@Query() q: ListReviewsDto) {
    return this.service.list(q);
  }

  @Get('reviews/stats')
  @ApiOperation({
    summary:
      'Review counts by status and rating, and questions waiting for an answer',
  })
  stats() {
    return this.service.stats();
  }

  @Patch('reviews/bulk-status')
  @ApiOperation({
    summary: 'Approve / reject / flag many reviews at once (max 200)',
  })
  bulk(@Body() dto: BulkReviewStatusDto) {
    return this.service.bulkStatus(dto.ids, dto.status);
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'One review with the customer, product and photos' })
  one(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch('reviews/:id/status')
  @ApiOperation({
    summary:
      'Approve, reject, flag or set a review back to pending. The product rating is recalculated.',
  })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetReviewStatusDto,
  ) {
    return this.service.setStatus(id, dto.status);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a review and its photos' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Get('questions')
  @ApiOperation({
    summary:
      'Product questions. answered=false lists the ones waiting for an answer.',
  })
  listQuestions(@Query() q: ListQuestionsDto) {
    return this.service.listQuestions(q);
  }

  @Put('questions/:id/answer')
  @ApiOperation({
    summary:
      'Answer a question (or edit the answer). The customer is notified on the first answer.',
  })
  answer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnswerQuestionDto,
  ) {
    return this.service.answer(id, dto);
  }

  @Delete('questions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a question (spam)' })
  removeQuestion(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeQuestion(id);
  }
}
