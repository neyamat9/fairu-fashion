import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
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
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  MAX_FILES_PER_REQUEST,
  MAX_UPLOAD_BYTES,
  UploadsService,
  type UploadView,
} from '../../common/uploads';

@ApiTags('Customer - Uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('review-images')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ medium: { ttl: 60000, limit: 20 } })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: MAX_FILES_PER_REQUEST },
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
      'Upload up to 5 review photos (JPG/PNG/WebP/GIF, 5 MB each). Returns ids to send as imageIds when creating/editing a review. Unused photos are deleted after 24 hours.',
  })
  async uploadReviewImages(
    @CurrentUser() user: User,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    if (!files?.length) {
      throw new BadRequestException(
        'Attach at least one photo in the "files" field',
      );
    }
    // One at a time keeps memory use and the per-user quota check exact.
    const saved: UploadView[] = [];
    for (const file of files) {
      saved.push(await this.uploads.saveImage(user.id, 'REVIEW_IMAGE', file));
    }
    return saved;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Delete one of my uploaded photos that is not attached to a review yet',
  })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const deleted = await this.uploads.deleteUnattached(user.id, id);
    if (!deleted) throw new NotFoundException('Upload not found');
    return { success: true };
  }
}
