import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { AdminReturnsService } from './returns.service';
import {
  ListReturnsDto,
  UpdateReturnStatusDto,
} from './dto/update-return-status.dto';

@ApiTags('Admin - Returns')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/returns')
export class AdminReturnsController {
  constructor(private readonly returnsService: AdminReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List all return requests' })
  async findAll(@Query() q: ListReturnsDto) {
    return this.returnsService.findAll(q.page, q.limit, q.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return request detail' })
  async findOne(@Param('id') id: string) {
    return this.returnsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Move a return through REQUESTED → APPROVED → PICKED_UP → RECEIVED (restocks) → REFUNDED/REPLACED, or REJECTED',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReturnStatusDto,
    @CurrentUser() admin: User,
  ) {
    return this.returnsService.updateStatus(id, dto.status, dto.note, admin.id);
  }
}
