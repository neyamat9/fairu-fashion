import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../cache';
import { SecretBox } from './secret-box';
import {
  DEFAULT_SETTINGS,
  SECRET_FIELDS,
  SETTINGS_GROUPS,
  SettingsGroup,
  SettingsMap,
} from './settings.types';

const CACHE_PREFIX = 'settings:';
const CACHE_TTL_SECONDS = 600;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly secretBox: SecretBox;

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    config: ConfigService,
  ) {
    this.secretBox = new SecretBox(
      config.get<string>('security.settingsEncryptionKey') ??
        config.get<string>('jwt.secret') ??
        'change-me',
    );
  }

  async get<G extends SettingsGroup>(group: G): Promise<SettingsMap[G]> {
    return this.cache.getOrSet(
      `${CACHE_PREFIX}${group}`,
      async () => {
        const row = await this.prisma.siteSetting.findUnique({
          where: { key: group },
        });
        const stored = row
          ? this.decryptSecrets(group, this.parse(row.value))
          : {};
        return this.merge(group, stored as Partial<SettingsMap[G]>);
      },
      CACHE_TTL_SECONDS,
    );
  }

  async getAll(): Promise<SettingsMap> {
    const entries = await Promise.all(
      SETTINGS_GROUPS.map(async (g) => [g, await this.get(g)] as const),
    );
    return Object.fromEntries(entries) as unknown as SettingsMap;
  }

  // What a group would look like after applying a patch, without saving.
  // DTO fields that were not sent are undefined and are ignored.
  async preview<G extends SettingsGroup>(
    group: G,
    patch: Partial<SettingsMap[G]>,
  ): Promise<SettingsMap[G]> {
    const current = await this.get(group);
    return this.merge(group, { ...current, ...this.stripUndefined(patch) });
  }

  // Partial update: only the provided fields change, everything else keeps
  // its current (or default) value.
  async update<G extends SettingsGroup>(
    group: G,
    patch: Partial<SettingsMap[G]>,
  ): Promise<SettingsMap[G]> {
    const next = await this.preview(group, patch);
    const stored = JSON.stringify(this.encryptSecrets(group, next));

    await this.prisma.siteSetting.upsert({
      where: { key: group },
      create: { key: group, group, value: stored },
      update: { value: stored },
    });

    this.cache.del(`${CACHE_PREFIX}${group}`);
    return next;
  }

  // Admin view of a group: secret values are never sent back. Each secret is
  // replaced by null plus a `<field>Set` flag telling whether one is stored.
  mask<G extends SettingsGroup>(group: G, value: SettingsMap[G]) {
    const out: Record<string, unknown> = { ...value };
    for (const field of SECRET_FIELDS[group] ?? []) {
      out[`${field}Set`] = Boolean(out[field]);
      out[field] = null;
    }
    return out;
  }

  private encryptSecrets(group: SettingsGroup, value: object) {
    const out: Record<string, unknown> = { ...value };
    for (const field of SECRET_FIELDS[group] ?? []) {
      const v = out[field];
      out[field] =
        typeof v === 'string' && v.length > 0
          ? this.secretBox.encrypt(v)
          : null;
    }
    return out;
  }

  private decryptSecrets(group: SettingsGroup, value: Record<string, unknown>) {
    const out = { ...value };
    for (const field of SECRET_FIELDS[group] ?? []) {
      const v = out[field];
      if (this.secretBox.isEncrypted(v)) {
        const plain = this.secretBox.decrypt(v);
        if (plain === null) {
          this.logger.warn(
            `Could not decrypt settings.${group}.${field} (encryption key changed?). Re-enter it in the admin dashboard.`,
          );
        }
        out[field] = plain;
      }
    }
    return out;
  }

  private merge<G extends SettingsGroup>(
    group: G,
    stored: Partial<SettingsMap[G]>,
  ): SettingsMap[G] {
    return { ...DEFAULT_SETTINGS[group], ...stored };
  }

  private parse(value: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private stripUndefined<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    ) as Partial<T>;
  }
}
