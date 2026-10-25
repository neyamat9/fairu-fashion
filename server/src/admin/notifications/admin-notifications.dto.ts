import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AdminNotificationType } from '@prisma/client';
import { toBool } from '../../common/utils/transforms';

export class ListAdminNotificationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'true = only unread' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  unread?: boolean;

  @ApiPropertyOptional({ enum: AdminNotificationType })
  @IsOptional()
  @IsIn(Object.values(AdminNotificationType))
  type?: AdminNotificationType;
}
