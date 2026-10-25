import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReturnReason } from '@prisma/client';

export class ReturnItemDto {
  @ApiProperty()
  @IsUUID()
  orderItemId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ enum: ['New', 'Opened', 'Damaged'] })
  @IsOptional()
  @IsIn(['New', 'Opened', 'Damaged'])
  condition?: string;
}

export class CreateReturnDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: ReturnReason })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiPropertyOptional({ description: 'Describe the problem' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  detail?: string;

  @ApiPropertyOptional({
    description: 'Pickup address, if different from the delivery address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  pickupAddress?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
