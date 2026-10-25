import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationsService } from '../../common/locations';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

// Every order stores a copy of its delivery address as an Address row. Those
// copies belong to the order (they must never change or disappear), so they
// are not part of the customer's address book.
const ADDRESS_BOOK: Prisma.AddressWhereInput = {
  shippingOrders: { none: {} },
  billingOrders: { none: {} },
};

const MAX_ADDRESSES = 20;

@Injectable()
export class AddressesService {
  constructor(
    private prisma: PrismaService,
    private locations: LocationsService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId, ...ADDRESS_BOOK },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({
      where: { userId, ...ADDRESS_BOOK },
    });
    if (count >= MAX_ADDRESSES) {
      throw new BadRequestException(
        `You can save at most ${MAX_ADDRESSES} addresses`,
      );
    }

    const { division, district, upazila, ...rest } = dto;
    const area = this.locations.resolve({ division, district, upazila });
    const city = rest.city?.trim() || area.district;
    if (!city) {
      throw new BadRequestException('Choose a district (or enter a city)');
    }

    return this.prisma.$transaction(async (tx) => {
      // The first address becomes the default automatically.
      const makeDefault = dto.isDefault || count === 0;
      if (makeDefault) {
        await tx.address.updateMany({
          where: { userId, ...ADDRESS_BOOK },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: {
          ...rest,
          city,
          state: rest.state ?? area.division,
          ...area,
          userId,
          isDefault: makeDefault,
          country: dto.country ?? 'Bangladesh',
        },
      });
    });
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.findOwned(userId, addressId);

    const { division, district, upazila, ...rest } = dto;
    const data: Prisma.AddressUpdateInput = { ...rest };

    const touchesArea =
      division !== undefined || district !== undefined || upazila !== undefined;
    if (touchesArea) {
      // Changing the district invalidates the old upazila/division unless the
      // request provides new ones.
      const districtChanged = district !== undefined;
      const area = this.locations.resolve({
        division: division ?? (districtChanged ? null : address.division),
        district: district ?? address.district,
        upazila: upazila ?? (districtChanged ? null : address.upazila),
      });
      Object.assign(data, area);
      if (districtChanged && rest.city === undefined && area.district) {
        data.city = area.district;
      }
      if (rest.state === undefined && area.division) data.state = area.division;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, ...ADDRESS_BOOK, id: { not: addressId } },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id: addressId }, data });
    });
  }

  async remove(userId: string, addressId: string) {
    const address = await this.findOwned(userId, addressId);
    await this.prisma.address.delete({ where: { id: addressId } });

    // Keep a default: promote the newest remaining address.
    if (address.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { userId, ...ADDRESS_BOOK },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return { success: true };
  }

  async setDefault(userId: string, addressId: string) {
    await this.findOwned(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, ...ADDRESS_BOOK },
        data: { isDefault: false },
      });
      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  private async findOwned(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId, ...ADDRESS_BOOK },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }
}
