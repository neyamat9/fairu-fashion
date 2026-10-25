import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../../common/uploads';

export interface MediaUsage {
  type: string;
  id: string;
  label: string;
  field: string;
}

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  // Everything that points at this file. Looked up by the file's unique path,
  // so it still works if the public URL prefix changes.
  async findUsage(uploadId: string): Promise<MediaUsage[]> {
    const upload = await this.prisma.upload.findFirst({
      where: { id: uploadId, purpose: 'ADMIN_MEDIA' },
    });
    if (!upload) throw new NotFoundException('File not found');
    const needle = upload.key;
    const has = { contains: needle };

    const [
      productImages,
      banners,
      brands,
      categories,
      subCategories,
      settings,
    ] = await Promise.all([
      this.prisma.productImage.findMany({
        where: { OR: [{ uploadId }, { url: has }] },
        select: {
          id: true,
          productId: true,
          product: { select: { name: true } },
        },
      }),
      this.prisma.banner.findMany({
        where: { OR: [{ imageUrl: has }, { mobileImageUrl: has }] },
        select: { id: true, title: true },
      }),
      this.prisma.brand.findMany({
        where: { OR: [{ logo: has }, { banner: has }] },
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        where: { OR: [{ image: has }, { icon: has }] },
        select: { id: true, name: true },
      }),
      this.prisma.subCategory.findMany({
        where: { OR: [{ image: has }, { icon: has }] },
        select: { id: true, name: true },
      }),
      this.prisma.siteSetting.findMany({
        where: { value: has },
        select: { key: true },
      }),
    ]);

    return [
      ...productImages.map((p) => ({
        type: 'product',
        id: p.productId,
        label: p.product.name,
        field: 'images',
      })),
      ...banners.map((b) => ({
        type: 'banner',
        id: b.id,
        label: b.title ?? b.id,
        field: 'imageUrl',
      })),
      ...brands.map((b) => ({
        type: 'brand',
        id: b.id,
        label: b.name,
        field: 'logo/banner',
      })),
      ...categories.map((c) => ({
        type: 'category',
        id: c.id,
        label: c.name,
        field: 'image/icon',
      })),
      ...subCategories.map((c) => ({
        type: 'sub-category',
        id: c.id,
        label: c.name,
        field: 'image/icon',
      })),
      ...settings.map((s) => ({
        type: 'setting',
        id: s.key,
        label: s.key,
        field: 'logo/favicon',
      })),
    ];
  }

  async remove(id: string, force: boolean) {
    const usage = await this.findUsage(id);
    if (usage.length && !force) {
      throw new ConflictException({
        message: `This file is used in ${usage.length} place(s). Remove it there first, or delete with force=true.`,
        usage,
      });
    }
    // Product photos that live on this file go with it
    await this.prisma.productImage.deleteMany({ where: { uploadId: id } });
    await this.uploads.deleteUpload(id);
    return { success: true, removedFrom: usage.length };
  }
}
