import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MEDIA_FOLDERS } from '../../common/uploads';
import type { MediaFolder } from '../../common/uploads';
import { toBool } from '../../common/utils/transforms';

export class UploadMediaQueryDto {
  @ApiPropertyOptional({ enum: MEDIA_FOLDERS, default: 'general' })
  @IsOptional()
  @IsIn(MEDIA_FOLDERS as readonly string[])
  folder?: MediaFolder;
}

export class ListMediaDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;

  @ApiPropertyOptional({ enum: MEDIA_FOLDERS })
  @IsOptional()
  @IsIn(MEDIA_FOLDERS as readonly string[])
  folder?: MediaFolder;

  @ApiPropertyOptional({ description: 'File name contains' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class DeleteMediaQueryDto {
  @ApiPropertyOptional({
    description: 'Delete even though the file is still used somewhere',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  force?: boolean;
}
