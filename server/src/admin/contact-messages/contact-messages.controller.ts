import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../common/settings';
import { MailService, escapeHtml, renderEmailLayout } from '../../common/mail';
import {
  ListContactMessagesDto,
  ReplyContactMessageDto,
  UpdateContactMessageDto,
} from './contact-messages.dto';

@ApiTags('Admin - Contact Messages')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/contact-messages')
export class AdminContactMessagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List contact form messages (newest first)' })
  async list(@Query() q: ListContactMessagesDto) {
    const search = q.search?.trim();
    const where: Prisma.ContactMessageWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total, unread] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.count({ where: { status: 'NEW' } }),
    ]);
    return {
      data,
      unread,
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a message (marks NEW messages as READ)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.status === 'NEW') {
      return this.prisma.contactMessage.update({
        where: { id },
        data: { status: 'READ' },
      });
    }
    return msg;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Change status or internal note' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactMessageDto,
  ) {
    await this.ensureExists(id);
    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote } : {}),
      },
    });
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a reply to the customer and mark REPLIED' })
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyContactMessageDto,
  ) {
    const msg = await this.ensureExists(id);
    const site = await this.settings.get('site');
    const subject = `Re: ${msg.subject}`;
    const result = await this.mail.send({
      to: msg.email,
      subject,
      text: `Hi ${msg.name},\n\n${dto.message}\n\n— ${site.storeName}\n\n> ${msg.message.split('\n').join('\n> ')}`,
      html: renderEmailLayout(site, {
        title: subject,
        bodyHtml: `<p>Hi ${escapeHtml(msg.name)},</p>
<div style="white-space:pre-wrap">${escapeHtml(dto.message)}</div>
<p>— ${escapeHtml(site.storeName)}</p>
<div style="margin-top:20px;padding:10px 12px;border-left:3px solid #ddd;color:#666;white-space:pre-wrap">${escapeHtml(msg.message)}</div>`,
      }),
    });
    if (!result.ok) {
      throw new BadRequestException(`Reply could not be sent: ${result.error}`);
    }
    return this.prisma.contactMessage.update({
      where: { id },
      data: { status: 'REPLIED', reply: dto.message, repliedAt: new Date() },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a message' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.ensureExists(id);
    await this.prisma.contactMessage.delete({ where: { id } });
    return { success: true };
  }

  private async ensureExists(id: string) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }
}
