import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

// Used by an admin to confirm or reject a manually submitted bKash payment
// (checked by hand against the merchant account — there is no gateway call).
export class VerifyPaymentDto {
  @ApiProperty({ enum: ['PAID', 'FAILED'] })
  @IsEnum(['PAID', 'FAILED'])
  paymentStatus: 'PAID' | 'FAILED';

  @ApiPropertyOptional({
    description: 'Optional admin note, e.g. why a payment was rejected',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
