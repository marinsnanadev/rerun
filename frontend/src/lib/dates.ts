/**
 * Calendar dates are plain `YYYY-MM-DD` strings with no time zone attached.
 * All arithmetic goes through UTC day numbers, so results never shift with the
 * viewer's time zone or daylight saving changes.
 */
export type ISODate = string;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isISODate(value: string): value is ISODate {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toDayNumber(date: ISODate): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) / MS_PER_DAY;
}

function fromDayNumber(dayNumber: number): ISODate {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/** The viewer's current calendar date, in their own time zone. */
export function todayISO(now: Date = new Date()): ISODate {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(date) + days);
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(date: ISODate): string {
  return dateFormatter.format(new Date(toDayNumber(date) * MS_PER_DAY));
}

export function describeDaysAgo(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}
