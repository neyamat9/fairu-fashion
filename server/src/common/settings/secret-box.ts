import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

// Encrypts secret settings (SMTP password, Resend API key) before they are
// written to the database, so a database dump alone does not expose them.
// AES-256-GCM; the key is derived from SETTINGS_ENCRYPTION_KEY (falling back
// to JWT_SECRET). Changing that key makes stored secrets unreadable — they
// then read as empty and must be re-entered in the admin dashboard.

const PREFIX = 'enc:v1:';

export class SecretBox {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash('sha256').update(secret).digest();
  }

  isEncrypted(value: unknown): value is string {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
  }

  // Returns null when the value cannot be decrypted (wrong key / corrupted).
  decrypt(value: string): string | null {
    try {
      const [iv, tag, data] = value.slice(PREFIX.length).split(':');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key,
        Buffer.from(iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return null;
    }
  }
}
