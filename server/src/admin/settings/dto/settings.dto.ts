import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// All fields are optional: a PUT only changes the fields it sends.
// Send `null` to clear a nullable field.

export class SocialLinksDto {
  @ApiPropertyOptional() @IsOptional() @IsString() facebook?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() instagram?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() youtube?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tiktok?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() twitter?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedin?: string;
}

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() storeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tagline?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ require_tld: false })
  logoUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ require_tld: false })
  faviconUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEmail()
  contactEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  hotline?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  whatsapp?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  businessHours?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currencySymbol?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  metaTitle?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  metaDescription?: string | null;

  @ApiPropertyOptional({ type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}

export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() codEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bkashEnabled?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  bkashNumber?: string | null;

  @ApiPropertyOptional({ enum: ['personal', 'merchant', 'agent'] })
  @IsOptional()
  @IsIn(['personal', 'merchant', 'agent'])
  bkashAccountType?: 'personal' | 'merchant' | 'agent';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  bkashInstructions?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() nagadEnabled?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  nagadNumber?: string | null;

  @ApiPropertyOptional({ enum: ['personal', 'merchant', 'agent'] })
  @IsOptional()
  @IsIn(['personal', 'merchant', 'agent'])
  nagadAccountType?: 'personal' | 'merchant' | 'agent';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  nagadInstructions?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() rocketEnabled?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  rocketNumber?: string | null;

  @ApiPropertyOptional({ enum: ['personal', 'merchant', 'agent'] })
  @IsOptional()
  @IsIn(['personal', 'merchant', 'agent'])
  rocketAccountType?: 'personal' | 'merchant' | 'agent';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  rocketInstructions?: string | null;
}

export class UpdateShippingSettingsDto {
  @ApiPropertyOptional({
    enum: ['GLOBAL', 'ZONE'],
    description:
      'GLOBAL = one flat rate for everyone; ZONE = separate inside/outside Dhaka rates',
  })
  @IsOptional()
  @IsIn(['GLOBAL', 'ZONE'])
  mode?: 'GLOBAL' | 'ZONE';

  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) globalRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) globalMinDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) globalMaxDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  insideDhakaRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  insideDhakaMinDays?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  insideDhakaMaxDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  outsideDhakaRate?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  outsideDhakaMinDays?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  outsideDhakaMaxDays?: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Cities treated as inside Dhaka when the customer does not pick a zone',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  insideDhakaCities?: string[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Free shipping at or above this subtotal. null disables it.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number | null;
}

export class UpdateReturnSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() returnsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  returnWindowDays?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  policyText?: string | null;
}

// Secrets (smtpPass, resendApiKey): omit to keep the stored value, send a
// new string to replace it, or send null / "" to remove it. Stored values are
// never returned — responses show smtpPassSet / resendApiKeySet instead.
export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ enum: ['none', 'smtp', 'resend'] })
  @IsOptional()
  @IsIn(['none', 'smtp', 'resend'])
  provider?: 'none' | 'smtp' | 'resend';

  @ApiPropertyOptional({ example: 'Fairu Fashion' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fromName?: string;

  @ApiPropertyOptional({ nullable: true, example: 'orders@fairufashion.com' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEmail()
  fromEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEmail()
  replyTo?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'smtp.gmail.com' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  smtpHost?: string | null;

  @ApiPropertyOptional({ example: 587 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiPropertyOptional({ description: 'true for port 465, false for 587' })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  smtpUser?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Write-only secret' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  smtpPass?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Write-only secret (re_...)',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(500)
  resendApiKey?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Receives new-order and contact-form alerts',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEmail()
  adminNotificationEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyCustomerOrderPlaced?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyCustomerOrderStatus?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyAdminNewOrder?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyAdminContactMessage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyAdminSupportTicket?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyCustomerTicketReply?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sendNewsletterWelcome?: boolean;
}

export class TestEmailDto extends UpdateEmailSettingsDto {
  @ApiProperty({ description: 'Where to send the test email' })
  @IsEmail()
  to: string;
}
