import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { GRANULARITIES } from '../analytics/analytics.service';
import type { Granularity } from '../analytics/analytics.service';

// A day (2026-10-01, a Bangladesh calendar day) or a full ISO time.
export const DATE_INPUT =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;

export class RangeQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Start (inclusive). Default: 30 days before `to`.',
  })
  @IsOptional()
  @Matches(DATE_INPUT, {
    message: 'from must be a date like 2026-09-01 or an ISO time',
  })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'End. A plain date includes that whole day. Default: now.',
  })
  @IsOptional()
  @Matches(DATE_INPUT, {
    message: 'to must be a date like 2026-09-30 or an ISO time',
  })
  to?: string;
}

export class SeriesQueryDto extends RangeQueryDto {
  @ApiPropertyOptional({
    enum: GRANULARITIES,
    description:
      'Default: day up to 62 days, week up to a year, otherwise month',
  })
  @IsOptional()
  @IsIn(GRANULARITIES)
  granularity?: Granularity;
}

export class TopQueryDto extends RangeQueryDto {
  @ApiPropertyOptional({ enum: ['revenue', 'units'], default: 'revenue' })
  @IsOptional()
  @IsIn(['revenue', 'units'])
  by: 'revenue' | 'units' = 'revenue';

  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

export class LimitQueryDto {
  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

export function autoGranularity(from: Date, to: Date): Granularity {
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  return days <= 62 ? 'day' : days <= 366 ? 'week' : 'month';
}
