import type { Lang } from './types';

/** Journey dates are month-level; the first day stored in the database is incidental. */
export function formatMonthYear(value: string, lang: Lang): string {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}
