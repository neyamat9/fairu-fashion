import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import { applyDecorators } from '@nestjs/common';

// Bangladeshi mobile numbers: 01[3-9]XXXXXXXX (11 digits).
export const BD_MOBILE_RE = /^01[3-9]\d{8}$/;

// Normalises "+88 01712-345678", "8801712345678", "01712 345678" ... to
// "01712345678". Returns the digits unchanged when they don't look like a
// BD number, so validation can reject them.
export function normalizeBdPhone(input: string): string {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('880')) return digits.slice(2);
  if (digits.length === 10 && digits.startsWith('1')) return `0${digits}`;
  return digits;
}

export function isBdMobile(input: string): boolean {
  return BD_MOBILE_RE.test(normalizeBdPhone(input));
}

// DTO decorator: normalises then validates a BD mobile number.
export function IsBdMobile() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? normalizeBdPhone(value) : value,
    ),
    Matches(BD_MOBILE_RE, {
      message: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678',
    }),
  );
}
