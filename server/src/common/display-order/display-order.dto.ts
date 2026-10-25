import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { BannerPosition } from '@prisma/client';

export class ReorderDto {
  @ApiProperty({
    type: [String],
    description:
      'ALL ids of the list in the wanted order (first = shown first)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  ids: string[];
}

export class ReorderSubCategoriesDto extends ReorderDto {
  @ApiProperty({
    description: 'The parent category whose sub-categories are being ordered',
  })
  @IsUUID()
  categoryId: string;
}

export class ReorderBannersDto extends ReorderDto {
  @ApiProperty({
    enum: BannerPosition,
    description: 'Banners are ordered within one position',
  })
  @IsEnum(BannerPosition)
  position: BannerPosition;
}
