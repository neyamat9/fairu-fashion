import { BadRequestException } from '@nestjs/common';

// Bangladesh is UTC+6 all year. "2026-10-01" means that calendar day in
// Bangladesh, so a report for "today" matches what the shop owner sees.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 24 * 60 * 60 * 1000;

export interface DateRange {
  from: Date; // inclusive
  to: Date; // exclusive
}

function parseBound(value: string, isEnd: boolean): Date {
  if (DATE_ONLY.test(value)) {
    const start = new Date(`${value}T00:00:00+06:00`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException(`"${value}" is not a valid date`);
    }
    // an end date is a whole day: include it
    return isEnd ? new Date(start.getTime() + DAY) : start;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`"${value}" is not a valid date`);
  }
  return d;
}

export const MAX_RANGE_DAYS = 731;

// Defaults to the last 30 days.
export function resolveRange(
  from?: string,
  to?: string,
  now = new Date(),
): DateRange {
  const end = to ? parseBound(to, true) : now;
  const start = from
    ? parseBound(from, false)
    : new Date(end.getTime() - 30 * DAY);
  if (start >= end) throw new BadRequestException('from must be before to');
  if ((end.getTime() - start.getTime()) / DAY > MAX_RANGE_DAYS) {
    throw new BadRequestException(
      `The date range can be at most ${MAX_RANGE_DAYS} days`,
    );
  }
  return { from: start, to: end };
}

// The period of the same length right before this one (for "vs last period").
export function previousRange(r: DateRange): DateRange {
  const len = r.to.getTime() - r.from.getTime();
  return { from: new Date(r.from.getTime() - len), to: r.from };
}
