import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';

@ApiTags('Customer - Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List my return requests' })
  async findAll(@CurrentUser() user: User) {
    return this.returnsService.findAll(user.id);
  }

  @Get('eligibility/:orderId')
  @ApiOperation({
    summary:
      'Check whether an order can be returned and which items/quantities',
  })
  async eligibility(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
  ) {
    return this.returnsService.getEligibility(user.id, orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a return request' })
  async findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.returnsService.findOne(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a return for items of a delivered order' })
  async create(@CurrentUser() user: User, @Body() dto: CreateReturnDto) {
    return this.returnsService.create(user.id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw a return request (only while REQUESTED)' })
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.returnsService.cancel(user.id, id);
  }
}
