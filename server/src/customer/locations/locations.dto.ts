import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsOptional } from 'class-validator';

export class SearchLocationsDto {
  @ApiProperty({ example: 'savar', description: 'At least 2 characters' })
  @IsString()
  @MaxLength(50)
  q: string;

  @ApiPropertyOptional({ default: 15, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 15;
}
