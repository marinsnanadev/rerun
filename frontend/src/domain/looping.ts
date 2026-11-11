import { daysBetween, type ISODate } from '../lib/dates';
import type { Show } from './show';

export interface QueueEntry {
  show: Show;
  /** Whole days since the show was last finished. Never negative. */
  daysSince: number;
  /** 1-based place in the rotation. 1 is what to watch next. */
  position: number;
}

/**
 * Builds the rotation: only shows marked as looping, ordered by the date they
 * were last finished, oldest first. Ties are broken by title, then id, so the
 * order is stable between renders.
 */
export function buildQueue(shows: readonly Show[], today: ISODate): QueueEntry[] {
  return shows
    .filter((show) => show.status === 'looping')
    .sort(
      (a, b) =>
        a.finishedOn.localeCompare(b.finishedOn) ||
        a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) ||
        a.id.localeCompare(b.id),
    )
    .map((show, index) => ({
      show,
      daysSince: Math.max(0, daysBetween(show.finishedOn, today)),
      position: index + 1,
    }));
}

/** The show to watch next, or `null` when the rotation is empty. */
export function getUpNext(queue: readonly QueueEntry[]): QueueEntry | null {
  return queue[0] ?? null;
}
