import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TicketCategory, TicketStatus } from '@prisma/client';
import { toBool } from '../../common/utils/transforms';

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class AdminListTicketsDto {
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

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsIn(Object.values(TicketStatus))
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: (typeof TICKET_PRIORITIES)[number];

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsIn(Object.values(TicketCategory))
  category?: TicketCategory;

  @ApiPropertyOptional({ description: 'Agent id, "me" or "unassigned"' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  assigned?: string;

  @ApiPropertyOptional({
    description: 'Ticket number, subject, customer name / email / phone',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Only tickets waiting for staff (OPEN)' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  needsReply?: boolean;
}

export class AdminReplyDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(10000)
  message: string;

  @ApiPropertyOptional({
    default: false,
    description: 'true = staff-only note, hidden from the customer',
  })
  @IsOptional()
  @IsBoolean()
  internal?: boolean;

  @ApiPropertyOptional({
    enum: TicketStatus,
    description:
      'Status after a customer-visible reply (default WAITING_CUSTOMER)',
  })
  @IsOptional()
  @IsIn(Object.values(TicketStatus))
  status?: TicketStatus;
}

export class AdminUpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsIn(Object.values(TicketStatus))
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: (typeof TICKET_PRIORITIES)[number];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Admin user id; null unassigns',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  assignedToId?: string | null;
}
