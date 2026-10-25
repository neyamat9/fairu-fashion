import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReturnStatus } from '@prisma/client';

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnStatus })
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @ApiPropertyOptional({
    description: 'Note shown to the customer (e.g. rejection reason)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class ListReturnsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;
}
