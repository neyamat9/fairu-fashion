import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Patch,
  Delete,
  BadRequestException,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { User } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  ListMyReviewsDto,
  UpdateReviewDto,
} from './dto/create-review.dto';
import { AskQuestionDto } from './dto/ask-question.dto';

@ApiTags('Customer - Reviews & Q&A')
@Controller('customer')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('products/:productId/reviews')
  @ApiOperation({ summary: 'Get product reviews with rating breakdown' })
  async getReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getProductReviews(
      productId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product review' })
  async createReview(@CurrentUser() user: User, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Get('reviews/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'My reviews (newest first), with product and photos',
  })
  async myReviews(@CurrentUser() user: User, @Query() q: ListMyReviewsDto) {
    return this.reviewsService.listMine(user.id, q.page, q.limit);
  }

  @Patch('reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edit my review (rating, title, comment, photos)',
  })
  async updateReview(
    @CurrentUser() user: User,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(user.id, reviewId, dto);
  }

  @Delete('reviews/:reviewId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete my review (and its photos)' })
  async deleteReview(
    @CurrentUser() user: User,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ) {
    return this.reviewsService.remove(user.id, reviewId);
  }

  @Post('reviews/:reviewId/vote')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote review as helpful/not helpful' })
  async vote(
    @CurrentUser() user: User,
    @Param('reviewId') reviewId: string,
    @Body('isHelpful') isHelpful: boolean,
  ) {
    if (typeof isHelpful !== 'boolean') {
      throw new BadRequestException('isHelpful must be true or false');
    }
    return this.reviewsService.voteHelpful(user.id, reviewId, isHelpful);
  }

  @Public()
  @Get('products/:productId/questions')
  @ApiOperation({ summary: 'Get product Q&A' })
  async getQuestions(@Param('productId') productId: string) {
    return this.reviewsService.getProductQuestions(productId);
  }

  @Post('questions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ask a question about a product' })
  async askQuestion(@CurrentUser() user: User, @Body() dto: AskQuestionDto) {
    return this.reviewsService.askQuestion(user.id, dto);
  }
}
