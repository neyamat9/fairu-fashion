import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toBool } from '../../common/utils/transforms';

export class ActivityFilterDto {
  @ApiPropertyOptional({ enum: ['ADMIN', 'CUSTOMER', 'GUEST', 'SYSTEM'] })
  @IsOptional()
  @IsIn(['ADMIN', 'CUSTOMER', 'GUEST', 'SYSTEM'])
  actorType?: 'ADMIN' | 'CUSTOMER' | 'GUEST' | 'SYSTEM';

  @ApiPropertyOptional({ description: 'User id' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  actorId?: string;

  @ApiPropertyOptional({ description: 'Actor name or email contains' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  actor?: string;

  @ApiPropertyOptional({
    description:
      'Action, or the start of one: admin.products, customer.auth.login.create',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  action?: string;

  @ApiPropertyOptional({
    description:
      'auth, order, catalog, inventory, marketing, customers, customer-care, settings, account, content, support, behavior, security, system',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @ApiPropertyOptional({ example: 'product' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityId?: string;

  @ApiPropertyOptional({
    description: 'true = succeeded, false = failed / blocked',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({ enum: ['POST', 'PUT', 'PATCH', 'DELETE', 'GET'] })
  @IsOptional()
  @IsIn(['POST', 'PUT', 'PATCH', 'DELETE', 'GET'])
  method?: string;

  @ApiPropertyOptional({ description: 'Exact IP address' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ip?: string;

  @ApiPropertyOptional({ description: 'From (ISO date/time, inclusive)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'To (ISO date/time, exclusive)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({
    description: 'Free text: summary, actor, entity, path',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class ListActivityDto extends ActivityFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;
}

export class ActivityStatsDto {
  @ApiPropertyOptional({ description: 'Default: 14 days ago' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Default: now' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
