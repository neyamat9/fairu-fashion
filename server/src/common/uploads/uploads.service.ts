import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Upload, UploadPurpose } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
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
const ALLOWED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'svg']);

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
  private readonly s3Client?: S3Client;
  private readonly r2Bucket?: string;
  private readonly r2PublicUrl?: string;
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

    const r2AccessKey = config.get<string>('r2.accessKeyId');
    const r2SecretKey = config.get<string>('r2.secretAccessKey');
    const r2Endpoint = config.get<string>('r2.endpoint');
    const r2Bucket = config.get<string>('r2.bucketName');
    const r2PublicUrl = config.get<string>('r2.publicUrl');

    if (r2AccessKey && r2SecretKey && r2Endpoint && r2Bucket && r2PublicUrl) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      });
      this.r2Bucket = r2Bucket;
      this.r2PublicUrl = r2PublicUrl.replace(/\/$/, '');
      this.logger.log(
        `Initialized Cloudflare R2 storage for bucket "${this.r2Bucket}" (Public URL: ${this.r2PublicUrl})`,
      );
    } else {
      this.logger.log('Cloudflare R2 not configured; falling back to local disk storage');
    }
  }

  isR2(): boolean {
    return !!(this.s3Client && this.r2Bucket && this.r2PublicUrl);
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
    if (/^https?:\/\//i.test(key)) return key;
    const cleanKey = key.replace(/^\/+/, '');
    if (this.isR2()) {
      return `${this.r2PublicUrl}/${cleanKey}`;
    }
    return `${this.publicBase}/uploads/${cleanKey}`;
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
    await this.writeBytes(key, full.data, 'image/webp');
    await this.writeBytes(thumbKey(key), thumb, 'image/webp');

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
    const allKeys = keys.flatMap((key) => [key, thumbKey(key)]);

    // 1. Delete from Cloudflare R2 if configured
    if (this.isR2()) {
      await Promise.all(
        allKeys.map(async (k) => {
          const rawKey =
            this.r2PublicUrl && k.startsWith(this.r2PublicUrl)
              ? k.slice(this.r2PublicUrl.length).replace(/^\/+/, '')
              : k.replace(/^\/+/, '');
          return this.s3Client!
            .send(
              new DeleteObjectCommand({
                Bucket: this.r2Bucket!,
                Key: rawKey,
              }),
            )
            .catch((e) => {
              this.logger.warn(
                `Could not delete R2 object ${rawKey}: ${e instanceof Error ? e.message : String(e)}`,
              );
            });
        }),
      );
    }

    // 2. Also remove from local disk (if it was stored locally or during fallback)
    await Promise.all(
      allKeys.map(async (k) => {
        try {
          const rawKey = k
            .replace(/^https?:\/\/[^/]+\//i, '')
            .replace(/^uploads\//i, '')
            .replace(/^\/+/, '');
          const localPath = this.pathFor(rawKey);
          await fs.unlink(localPath);
        } catch {
          // Missing local file is not an error
        }
      }),
    );
  }

  // Copies a stored image (files + a new library entry), e.g. when a product
  // is duplicated, so the copy never depends on the original's files.
  async duplicate(upload: Upload, userId: string): Promise<Upload> {
    const id = randomUUID();
    const key = upload.key.replace(/[^/]+\.webp$/, `${id}.webp`);

    if (this.isR2()) {
      let copiedOnR2 = false;
      try {
        await this.s3Client!.send(
          new CopyObjectCommand({
            Bucket: this.r2Bucket!,
            CopySource: `${this.r2Bucket}/${upload.key}`,
            Key: key,
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
        copiedOnR2 = true;
        await this.s3Client!
          .send(
            new CopyObjectCommand({
              Bucket: this.r2Bucket!,
              CopySource: `${this.r2Bucket}/${thumbKey(upload.key)}`,
              Key: thumbKey(key),
              ContentType: 'image/webp',
              CacheControl: 'public, max-age=31536000, immutable',
            }),
          )
          .catch(() => undefined);
      } catch {
        // If not found in R2, check local disk fallback
        try {
          const localData = await fs.readFile(this.pathFor(upload.key));
          await this.writeBytes(key, localData, 'image/webp');
          const thumbData = await fs
            .readFile(this.pathFor(thumbKey(upload.key)))
            .catch(() => null);
          if (thumbData) {
            await this.writeBytes(thumbKey(key), thumbData, 'image/webp');
          }
          copiedOnR2 = true;
        } catch {
          // ignore
        }
      }
      if (!copiedOnR2) {
        throw new Error(`Failed to copy image "${upload.key}" on storage`);
      }
    } else {
      await fs.mkdir(path.dirname(this.pathFor(key)), { recursive: true });
      await fs.copyFile(this.pathFor(upload.key), this.pathFor(key));
      await fs
        .copyFile(this.pathFor(thumbKey(upload.key)), this.pathFor(thumbKey(key)))
        .catch(() => undefined);
    }

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

  private async writeBytes(
    key: string,
    data: Buffer,
    contentType = 'image/webp',
  ) {
    if (this.isR2()) {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: this.r2Bucket!,
          Key: key,
          Body: data,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } else {
      await this.writeFile(key, data);
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
