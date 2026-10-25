import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TicketCategory, TicketStatus } from '@prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTicketDto {
  @ApiProperty({ example: 'Charger stopped working' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject: string;

  @ApiProperty({ example: 'I bought the charger 2 weeks ago and ...' })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({ enum: TicketCategory, default: 'OTHER' })
  @IsOptional()
  @IsIn(Object.values(TicketCategory))
  category?: TicketCategory;

  @ApiPropertyOptional({
    description: 'One of my orders this ticket is about',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

export class TicketMessageDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  message: string;
}

export class ListTicketsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsIn(Object.values(TicketStatus))
  status?: TicketStatus;
}
