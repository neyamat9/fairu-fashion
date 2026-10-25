import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ContactMessageStatus } from '@prisma/client';

export class ListContactMessagesDto {
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

  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @IsIn(Object.values(ContactMessageStatus))
  status?: ContactMessageStatus;

  @ApiPropertyOptional({ description: 'Search name, email, phone or subject' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class UpdateContactMessageDto {
  @ApiPropertyOptional({ enum: ContactMessageStatus })
  @IsOptional()
  @IsIn(Object.values(ContactMessageStatus))
  status?: ContactMessageStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  adminNote?: string | null;
}

export class ReplyContactMessageDto {
  @ApiProperty({ description: 'Reply sent to the customer by email' })
  @IsString()
  @MinLength(2)
  @MaxLength(10000)
  message: string;
}
