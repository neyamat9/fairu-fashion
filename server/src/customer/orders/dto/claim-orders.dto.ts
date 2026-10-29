import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsBdMobile } from '../../../common/utils/phone';

export class ClaimOrderDto {
  @ApiProperty({ example: 'FF-20261002-0007' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  orderNumber: string;

  @ApiProperty({
    example: '01712345678',
    description: 'The phone number the order was placed with',
  })
  @IsString()
  @IsBdMobile()
  phone: string;
}

export class ClaimOrdersDto {
  @ApiProperty({ type: [ClaimOrderDto], description: 'Up to 10 orders' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ClaimOrderDto)
  orders: ClaimOrderDto[];
}
