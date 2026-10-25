import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Upload, UploadPurpose } from '@prisma/client';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// The shop's own photos (product shots) may be larger.
export const MAX_ADMIN_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_ADMIN_FILES_PER_REQUEST = 10;
export const MAX_FILES_PER_REQUEST = 5;
export const MAX_IMAGES_PER_REVIEW = 5;

// Per-user limits so one account cannot fill the disk.
const MAX_UNATTACHED_PER_USER = 20;
const MAX_UPLOADS_PER_DAY = 60;
// Uploads that were never attached to anything are deleted after this long.

// What we accept as input. Everything is re-encoded to WebP, so the stored
// file is never the user's original bytes.
const ALLOWED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

const FULL_SIZE_PX = 1600;
const THUMB_SIZE_PX = 400;
// Refuse decompression bombs (a tiny file that expands to a huge bitmap).
const MAX_INPUT_PIXELS = 40_000_000;

export interface UploadView {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

// Folders of the admin media library.
export const MEDIA_FOLDERS = [
  'products',
  'banners',
  'brands',
  'categories',
  'site',
  'general',
] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export interface SaveImageOptions {
  folder?: MediaFolder;
  originalName?: string;
}

const MEDIA_FULL_SIZE_PX = 2000;

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class UploadsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UploadsService.name);
  private readonly rootDir: string;
  private readonly publicBase: string;
  private readonly cleanupIntervalMs: number;
  private readonly unattachedTtlMs: number;
  private timer?: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.rootDir = path.resolve(config.get<string>('uploads.dir') ?? 'uploads');
    this.publicBase = config.get<string>('uploads.publicBaseUrl') ?? '';
    this.cleanupIntervalMs =
      config.get<number>('uploads.cleanupIntervalMs') ?? 60 * 60 * 1000;
    this.unattachedTtlMs =
      config.get<number>('uploads.unattachedTtlMs') ?? 24 * 60 * 60 * 1000;
  }

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.cleanupUnattached();
    }, this.cleanupIntervalMs);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  url(key: string) {
    return `${this.publicBase}/uploads/${key}`;
  }

  thumbUrl(key: string) {
    return this.url(thumbKey(key));
  }

  view(upload: Pick<Upload, 'id' | 'key' | 'width' | 'height'>): UploadView {
    return {
      id: upload.id,
      url: this.url(upload.key),
      thumbUrl: this.thumbUrl(upload.key),
      width: upload.width,
      height: upload.height,
    };
  }

  // Validates, re-encodes and stores one image, and records it for the user.
  async saveImage(
    userId: string,
    purpose: UploadPurpose,
    file: Express.Multer.File,
    options: SaveImageOptions = {},
  ): Promise<UploadView> {
    // Customers' review photos are rationed; the shop's own media is not.
    if (purpose === 'REVIEW_IMAGE') await this.assertQuota(userId, purpose);
    const fullSide =
      purpose === 'ADMIN_MEDIA' ? MEDIA_FULL_SIZE_PX : FULL_SIZE_PX;
    const folder =
      purpose === 'ADMIN_MEDIA' ? (options.folder ?? 'general') : null;

    let full: { data: Buffer; info: sharp.OutputInfo };
    let thumb: Buffer;
    try {
      const input = sharp(file.buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
        failOn: 'error',
      });
      const meta = await input.metadata();
      // Judge the real content, never the client's file name or MIME type.
      if (!meta.format || !ALLOWED_INPUT_FORMATS.has(meta.format)) {
        throw new Error('unsupported format');
      }
      // .rotate() applies the camera orientation; re-encoding drops all
      // metadata (EXIF GPS location, camera serial...).
      const base = input.rotate();
      [full, thumb] = await Promise.all([
        base
          .clone()
          .resize({
            width: fullSide,
            height: fullSide,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 82 })
          .toBuffer({ resolveWithObject: true }),
        base
          .clone()
          .resize({
            width: THUMB_SIZE_PX,
            height: THUMB_SIZE_PX,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 75 })
          .toBuffer(),
      ]);
    } catch {
      throw new BadRequestException(
        'The file is not a valid image. Upload a JPG, PNG, WebP or GIF photo (max 5 MB).',
      );
    }

    const id = randomUUID();
    const key = `${folderFor(purpose, folder)}/${id}.webp`;
    await this.writeFile(key, full.data);
    await this.writeFile(thumbKey(key), thumb);

    try {
      const row = await this.prisma.upload.create({
        data: {
          id,
          purpose,
          key,
          mimeType: 'image/webp',
          size: full.data.length,
          width: full.info.width,
          height: full.info.height,
          originalName: options.originalName?.slice(0, 200) ?? null,
          folder,
          userId,
        },
      });
      return this.view(row);
    } catch (error) {
      await this.removeFiles([key]);
      throw error;
    }
  }

  // Resolves the uploads a user wants to attach (all must be theirs, of the
  // right kind, and either unattached or already on `allowReviewId`).
  async resolveOwned(
    db: Db,
    userId: string,
    purpose: UploadPurpose,
    ids: string[],
    allowReviewId?: string,
  ): Promise<Upload[]> {
    if (ids.length === 0) return [];
    const rows = await db.upload.findMany({
      where: {
        id: { in: ids },
        userId,
        purpose,
        OR: [
          { reviewId: null },
          ...(allowReviewId ? [{ reviewId: allowReviewId }] : []),
        ],
      },
    });
    if (rows.length !== new Set(ids).size) {
      throw new BadRequestException(
        'One of the photos was not found, was already used, or has expired. Please upload it again.',
      );
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)!);
  }

  // Deletes a user's own upload that is not attached to anything yet.
  async deleteUnattached(userId: string, id: string) {
    const row = await this.prisma.upload.findFirst({
      where: { id, userId, reviewId: null },
    });
    if (!row) return false;
    await this.prisma.upload.delete({ where: { id } });
    await this.removeFiles([row.key]);
    return true;
  }

  // Removes stored files (best effort — a missing file is not an error).
  async removeFiles(keys: string[]) {
    await Promise.all(
      keys.flatMap((key) =>
        [key, thumbKey(key)].map((k) =>
          fs.unlink(this.pathFor(k)).catch((e: NodeJS.ErrnoException) => {
            if (e.code !== 'ENOENT') {
              this.logger.warn(`Could not delete ${k}: ${e.message}`);
            }
          }),
        ),
      ),
    );
  }

  // Copies a stored image (files + a new library entry), e.g. when a product
  // is duplicated, so the copy never depends on the original's files.
  async duplicate(upload: Upload, userId: string): Promise<Upload> {
    const id = randomUUID();
    const key = upload.key.replace(/[^/]+\.webp$/, `${id}.webp`);
    await fs.mkdir(path.dirname(this.pathFor(key)), { recursive: true });
    await fs.copyFile(this.pathFor(upload.key), this.pathFor(key));
    await fs
      .copyFile(this.pathFor(thumbKey(upload.key)), this.pathFor(thumbKey(key)))
      .catch(() => undefined);
    try {
      return await this.prisma.upload.create({
        data: {
          id,
          purpose: upload.purpose,
          key,
          mimeType: upload.mimeType,
          size: upload.size,
          width: upload.width,
          height: upload.height,
          originalName: upload.originalName,
          folder: upload.folder,
          userId,
        },
      });
    } catch (error) {
      await this.removeFiles([key]);
      throw error;
    }
  }

  // Removes an upload row and its files.
  async deleteUpload(id: string) {
    const row = await this.prisma.upload.findUnique({ where: { id } });
    if (!row) return false;
    await this.prisma.upload.delete({ where: { id } });
    await this.removeFiles([row.key]);
    return true;
  }

  async cleanupUnattached() {
    try {
      const stale = await this.prisma.upload.findMany({
        where: {
          // only customers' unused review photos; the media library is kept
          purpose: 'REVIEW_IMAGE',
          reviewId: null,
          createdAt: { lt: new Date(Date.now() - this.unattachedTtlMs) },
        },
        take: 500,
      });
      if (!stale.length) return;
      await this.prisma.upload.deleteMany({
        where: { id: { in: stale.map((s) => s.id) } },
      });
      await this.removeFiles(stale.map((s) => s.key));
      this.logger.log(`Removed ${stale.length} unused uploads`);
    } catch (error) {
      this.logger.warn(
        `Upload cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async assertQuota(userId: string, purpose: UploadPurpose) {
    const [unattached, today] = await Promise.all([
      this.prisma.upload.count({
        where: { userId, purpose, reviewId: null },
      }),
      this.prisma.upload.count({
        where: {
          userId,
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    if (unattached >= MAX_UNATTACHED_PER_USER) {
      throw new BadRequestException(
        'Too many photos waiting to be used. Attach them to a review or remove some first.',
      );
    }
    if (today >= MAX_UPLOADS_PER_DAY) {
      throw new BadRequestException(
        'Daily upload limit reached. Please try again tomorrow.',
      );
    }
  }

  private pathFor(key: string) {
    const full = path.resolve(this.rootDir, key);
    // Keys are generated here, but never trust a path blindly.
    if (!full.startsWith(this.rootDir + path.sep)) {
      throw new Error(`Invalid upload key: ${key}`);
    }
    return full;
  }

  private async writeFile(key: string, data: Buffer) {
    const full = this.pathFor(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data, { flag: 'wx' });
  }
}

export function thumbKey(key: string) {
  return key.replace(/\.webp$/, '_thumb.webp');
}

function folderFor(purpose: UploadPurpose, folder: string | null) {
  switch (purpose) {
    case 'REVIEW_IMAGE':
      return 'reviews';
    case 'ADMIN_MEDIA':
      return `media/${folder ?? 'general'}`;
  }
}
