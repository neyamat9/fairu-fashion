import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MAX_ADMIN_FILES_PER_REQUEST,
  MAX_ADMIN_UPLOAD_BYTES,
  UploadsService,
  type UploadView,
} from '../../common/uploads';
import { MediaService } from './media.service';
import {
  DeleteMediaQueryDto,
  ListMediaDto,
  UploadMediaQueryDto,
} from './media.dto';

@ApiTags('Admin - Media Library')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/uploads')
export class MediaController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly media: MediaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', MAX_ADMIN_FILES_PER_REQUEST, {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_ADMIN_UPLOAD_BYTES,
        files: MAX_ADMIN_FILES_PER_REQUEST,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOperation({
    summary:
      'Upload up to 10 images (JPG/PNG/WebP/GIF, 10 MB each) into a library folder. Use the returned url for banners, brands, categories, logos.',
  })
  async upload(
    @CurrentUser() admin: User,
    @Query() q: UploadMediaQueryDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'Attach at least one image in the "files" field',
      );
    }
    const saved: (UploadView & { folder: string; originalName: string })[] = [];
    for (const file of files) {
      const view = await this.uploads.saveImage(admin.id, 'ADMIN_MEDIA', file, {
        folder: q.folder,
        originalName: file.originalname,
      });
      saved.push({
        ...view,
        folder: q.folder ?? 'general',
        originalName: file.originalname,
      });
    }
    return saved;
  }

  @Get()
  @ApiOperation({ summary: 'Media library: uploaded images, newest first' })
  async list(@Query() q: ListMediaDto) {
    const where: Prisma.UploadWhereInput = {
      purpose: 'ADMIN_MEDIA',
      ...(q.folder ? { folder: q.folder } : {}),
      ...(q.search?.trim()
        ? { originalName: { contains: q.search.trim(), mode: 'insensitive' } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.upload.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.upload.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        ...this.uploads.view(r),
        folder: r.folder,
        originalName: r.originalName,
        size: r.size,
        createdAt: r.createdAt,
      })),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  @Get(':id/usage')
  @ApiOperation({
    summary:
      'Where a file is used (products, banners, brands, categories, settings)',
  })
  usage(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.findUsage(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Delete a file. Refused (409 + usage list) while it is in use, unless force=true.',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: DeleteMediaQueryDto,
  ) {
    return this.media.remove(id, q.force === true);
  }
}
