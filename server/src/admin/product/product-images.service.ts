import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { UploadsService } from '../../common/uploads';
import {
  AttachImagesDto,
  ReorderImagesDto,
  UpdateImageDto,
} from './dto/product-admin.dto';
import { ProductService } from './product.service';

export const MAX_IMAGES_PER_PRODUCT = 20;

// Photos of a product. Invariant kept after every call: if the product has
// any photos, exactly one is the main photo, and `order` runs 0..n-1.
@Injectable()
export class ProductImagesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private uploads: UploadsService,
    private products: ProductService,
  ) {}

  list(productId: string) {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // Files uploaded straight from the product page: stored in the media
  // library (folder "products") and attached right away.
  async upload(
    productId: string,
    adminId: string,
    files: Express.Multer.File[],
    alt?: string,
  ) {
    await this.products.assertExists(productId);
    await this.assertRoom(productId, files.length);

    const saved: string[] = [];
    try {
      for (const file of files) {
        const view = await this.uploads.saveImage(
          adminId,
          'ADMIN_MEDIA',
          file,
          {
            folder: 'products',
            originalName: file.originalname,
          },
        );
        saved.push(view.id);
      }
    } catch (error) {
      for (const id of saved)
        await this.uploads.deleteUpload(id).catch(() => undefined);
      throw error;
    }
    return this.attach(productId, { uploadIds: saved }, alt);
  }

  async attach(productId: string, dto: AttachImagesDto, alt?: string) {
    await this.products.assertExists(productId);
    const uploadIds = dto.uploadIds ?? [];
    const urls = dto.urls ?? [];
    if (!uploadIds.length && !urls.length) {
      throw new BadRequestException('Give at least one uploadId or url');
    }
    await this.assertRoom(productId, uploadIds.length + urls.length);

    const uploads = uploadIds.length
      ? await this.prisma.upload.findMany({
          where: { id: { in: uploadIds }, purpose: 'ADMIN_MEDIA' },
          include: { productImage: { select: { id: true } } },
        })
      : [];
    if (uploads.length !== uploadIds.length) {
      throw new BadRequestException(
        'Some files were not found in the media library',
      );
    }
    const used = uploads.find((u) => u.productImage);
    if (used) {
      throw new ConflictException(
        'A file is already used by a product photo. Upload it again to use it on another product.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productImage.count({ where: { productId } });
      let order = existing;
      const rows = [
        ...uploadIds.map((id) => {
          const u = uploads.find((x) => x.id === id)!;
          return { url: this.uploads.url(u.key), uploadId: id };
        }),
        ...urls.map((url) => ({ url, uploadId: null as string | null })),
      ];
      for (const r of rows) {
        await tx.productImage.create({
          data: {
            url: r.url,
            uploadId: r.uploadId,
            alt: alt ?? null,
            isMain: existing === 0 && order === 0,
            order: order++,
            productId,
          },
        });
      }
    });
    this.cache.delByPrefix('products:');
    return this.list(productId);
  }

  async update(productId: string, imageId: string, dto: UpdateImageDto) {
    await this.find(productId, imageId);
    if (dto.isMain === false) {
      throw new BadRequestException(
        'A product always needs a main photo: make another photo the main one instead',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      if (dto.isMain) {
        await tx.productImage.updateMany({
          where: { productId },
          data: { isMain: false },
        });
      }
      await tx.productImage.update({
        where: { id: imageId },
        data: {
          ...(dto.alt !== undefined ? { alt: dto.alt } : {}),
          ...(dto.isMain ? { isMain: true } : {}),
        },
      });
    });
    this.cache.delByPrefix('products:');
    return this.list(productId);
  }

  async reorder(productId: string, dto: ReorderImagesDto) {
    const images = await this.list(productId);
    const ids = new Set(images.map((i) => i.id));
    if (
      dto.imageIds.length !== ids.size ||
      dto.imageIds.some((id) => !ids.has(id))
    ) {
      throw new BadRequestException(
        'imageIds must list every photo of this product exactly once',
      );
    }
    await this.prisma.$transaction(
      dto.imageIds.map((id, order) =>
        this.prisma.productImage.update({ where: { id }, data: { order } }),
      ),
    );
    this.cache.delByPrefix('products:');
    return this.list(productId);
  }

  // Removes the photo from the product. The file stays in the media library.
  async remove(productId: string, imageId: string) {
    const image = await this.find(productId, imageId);
    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });
      const rest = await tx.productImage.findMany({
        where: { productId },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
      for (const [i, r] of rest.entries()) {
        const isMain = image.isMain ? i === 0 : r.isMain;
        if (r.order !== i || r.isMain !== isMain) {
          await tx.productImage.update({
            where: { id: r.id },
            data: { order: i, isMain },
          });
        }
      }
    });
    this.cache.delByPrefix('products:');
    return this.list(productId);
  }

  private async find(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('Photo not found');
    return image;
  }

  private async assertRoom(productId: string, adding: number) {
    const count = await this.prisma.productImage.count({
      where: { productId },
    });
    if (count + adding > MAX_IMAGES_PER_PRODUCT) {
      throw new BadRequestException(
        `A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos (it has ${count})`,
      );
    }
  }
}
