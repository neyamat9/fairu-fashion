import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import {
  EmailSettings,
  SECRET_FIELDS,
  SETTINGS_GROUPS,
  SettingsMap,
  SettingsGroup,
  SettingsService,
} from '../../common/settings';
import { MailService } from '../../common/mail';
import { AuditService } from '../../common/audit';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import {
  UpdatePaymentSettingsDto,
  UpdateReturnSettingsDto,
  UpdateShippingSettingsDto,
  UpdateSiteSettingsDto,
  UpdateEmailSettingsDto,
  TestEmailDto,
} from './dto/settings.dto';

@ApiTags('Admin - Settings')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  // Saves a settings group and records which values changed (secrets are
  // never written to the trail).
  private async save<G extends SettingsGroup>(
    group: G,
    patch: Partial<SettingsMap[G]>,
    admin: User,
  ): Promise<SettingsMap[G]> {
    const before = (await this.settings.get(group)) as unknown as Record<
      string,
      unknown
    >;
    const after = await this.settings.update(group, patch);
    const afterRow = after as unknown as Record<string, unknown>;
    const secrets: string[] = SECRET_FIELDS[group] ?? [];
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    const sensitiveFieldsChanged: string[] = [];
    for (const key of Object.keys(afterRow)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(afterRow[key])) {
        if (secrets.includes(key)) sensitiveFieldsChanged.push(key);
        else {
          oldValue[key] = before[key];
          newValue[key] = afterRow[key];
        }
      }
    }
    if (sensitiveFieldsChanged.length) {
      // only the fact that it changed; never the value
      newValue.sensitiveFieldsChanged = sensitiveFieldsChanged;
    }
    if (Object.keys(newValue).length) {
      await this.audit.recordSafe({
        adminId: admin.id,
        action: 'SETTINGS_UPDATED',
        entity: `Settings:${group}`,
        entityId: group,
        oldValue,
        newValue,
      });
    }
    return after;
  }

  @Get()
  @ApiOperation({
    summary: 'Get all store settings (site, payment, shipping, returns)',
  })
  async getAll() {
    const all = await this.settings.getAll();
    return { ...all, email: this.settings.mask('email', all.email) };
  }

  @Get(':group')
  @ApiOperation({ summary: 'Get one settings group' })
  async getGroup(@Param('group') group: string) {
    if (!SETTINGS_GROUPS.includes(group as SettingsGroup)) {
      throw new BadRequestException(
        `Unknown settings group. Use one of: ${SETTINGS_GROUPS.join(', ')}`,
      );
    }
    const g = group as SettingsGroup;
    return this.settings.mask(g, await this.settings.get(g));
  }

  @Put('site')
  @ApiOperation({
    summary: 'Update store info (name, logo, contact, social, SEO)',
  })
  async updateSite(
    @Body() dto: UpdateSiteSettingsDto,
    @CurrentUser() admin: User,
  ) {
    return this.save('site', dto, admin);
  }

  @Put('payment')
  @ApiOperation({
    summary: 'Update payment options (COD / manual bKash, Nagad, Rocket)',
  })
  async updatePayment(
    @Body() dto: UpdatePaymentSettingsDto,
    @CurrentUser() admin: User,
  ) {
    const next = await this.settings.preview('payment', dto);
    if (
      !next.codEnabled &&
      !next.bkashEnabled &&
      !next.nagadEnabled &&
      !next.rocketEnabled
    ) {
      throw new BadRequestException(
        'At least one payment method must stay enabled',
      );
    }
    for (const [on, number, label] of [
      [next.bkashEnabled, next.bkashNumber, 'bKash'],
      [next.nagadEnabled, next.nagadNumber, 'Nagad'],
      [next.rocketEnabled, next.rocketNumber, 'Rocket'],
    ] as const) {
      if (on && !number) {
        throw new BadRequestException(
          `Set a ${label} number before enabling ${label}`,
        );
      }
    }
    return this.save('payment', dto, admin);
  }

  @Put('shipping')
  @ApiOperation({
    summary:
      'Update shipping charge (GLOBAL flat rate or inside/outside Dhaka ZONE rates)',
  })
  async updateShipping(
    @Body() dto: UpdateShippingSettingsDto,
    @CurrentUser() admin: User,
  ) {
    const next = await this.settings.preview('shipping', dto);
    const ranges: [number, number, string][] = [
      [next.globalMinDays, next.globalMaxDays, 'global'],
      [next.insideDhakaMinDays, next.insideDhakaMaxDays, 'inside Dhaka'],
      [next.outsideDhakaMinDays, next.outsideDhakaMaxDays, 'outside Dhaka'],
    ];
    for (const [min, max, label] of ranges) {
      if (min > max) {
        throw new BadRequestException(
          `${label}: min days cannot exceed max days`,
        );
      }
    }
    if (dto.insideDhakaCities) {
      dto.insideDhakaCities = dto.insideDhakaCities
        .map((c) => c.trim())
        .filter(Boolean);
    }
    return this.save('shipping', dto, admin);
  }

  @Put('returns')
  @ApiOperation({
    summary: 'Update return policy (enabled, window days, policy text)',
  })
  async updateReturns(
    @Body() dto: UpdateReturnSettingsDto,
    @CurrentUser() admin: User,
  ) {
    return this.save('returns', dto, admin);
  }

  @Put('email')
  @ApiOperation({
    summary:
      'Update email settings (provider SMTP or Resend, sender, alerts). Secrets are write-only.',
  })
  async updateEmail(
    @Body() dto: UpdateEmailSettingsDto,
    @CurrentUser() admin: User,
  ) {
    const patch = this.normalizeEmailPatch(dto);
    const next = await this.settings.preview('email', patch);
    this.assertEmailConfigComplete(next);
    return this.settings.mask('email', await this.save('email', patch, admin));
  }

  @Post('email/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Send a test email. Uses saved settings, overridden by any fields in the body (test before saving).',
  })
  async testEmail(@Body() dto: TestEmailDto) {
    const { to, ...rest } = dto;
    const overrides = this.normalizeEmailPatch(rest);
    const result = await this.mail.sendTest(to, overrides);
    if (!result.ok) {
      throw new BadRequestException(
        `Test email failed (${result.provider}): ${result.error}`,
      );
    }
    return {
      success: true,
      message: `Test email sent to ${to} via ${result.provider}`,
    };
  }

  // "" means "remove" for secrets; drop undefined so stored values are kept.
  private normalizeEmailPatch(dto: UpdateEmailSettingsDto) {
    const patch: Partial<EmailSettings> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      (patch as Record<string, unknown>)[k] =
        (k === 'smtpPass' || k === 'resendApiKey') && v === '' ? null : v;
    }
    if (typeof patch.smtpHost === 'string')
      patch.smtpHost = patch.smtpHost.trim();
    return patch;
  }

  private assertEmailConfigComplete(s: EmailSettings) {
    const sender = s.fromEmail ?? s.smtpUser;
    if (s.provider === 'smtp') {
      if (!s.smtpHost) throw new BadRequestException('SMTP host is required');
      if (!sender || !this.mail.isValidEmail(sender)) {
        throw new BadRequestException('Set a valid "from" email for SMTP');
      }
    }
    if (s.provider === 'resend') {
      if (!s.resendApiKey)
        throw new BadRequestException('Resend API key is required');
      if (!s.fromEmail) {
        throw new BadRequestException(
          'Set a "from" email on a domain verified in Resend',
        );
      }
    }
  }
}
