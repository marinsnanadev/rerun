import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, describeDaysAgo, formatDate, isISODate, todayISO } from './dates';

describe('isISODate', () => {
  it('accepts real calendar dates', () => {
    expect(isISODate('2026-10-20')).toBe(true);
    expect(isISODate('2028-02-29')).toBe(true);
  });

  it('rejects malformed strings and impossible dates', () => {
    expect(isISODate('')).toBe(false);
    expect(isISODate('2026-1-5')).toBe(false);
    expect(isISODate('2026-02-30')).toBe(false);
    expect(isISODate('2027-02-29')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-09-19', '2026-10-20')).toBe(31);
    expect(daysBetween('2026-07-10', '2026-10-20')).toBe(102);
  });

  it('is zero for the same day and negative when going backwards', () => {
    expect(daysBetween('2026-10-20', '2026-10-20')).toBe(0);
    expect(daysBetween('2026-10-20', '2026-10-19')).toBe(-1);
  });

  it('handles month, year and leap-day boundaries', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
  });

  it('is not affected by daylight saving transitions', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
  });
});

describe('addDays', () => {
  it('moves forwards and backwards across boundaries', () => {
    expect(addDays('2026-10-20', 12)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-20', 0)).toBe('2026-10-20');
  });
});

describe('todayISO', () => {
  it('uses the local calendar date', () => {
    expect(todayISO(new Date(2026, 9, 20, 23, 59))).toBe('2026-10-20');
    expect(todayISO(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});

describe('formatDate', () => {
  it('formats without drifting a day', () => {
    expect(formatDate('2026-09-19')).toBe('Sep 19, 2026');
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
  });
});

describe('describeDaysAgo', () => {
  it('uses plain language for recent dates', () => {
    expect(describeDaysAgo(0)).toBe('today');
    expect(describeDaysAgo(1)).toBe('yesterday');
    expect(describeDaysAgo(45)).toBe('45 days ago');
  });
});
