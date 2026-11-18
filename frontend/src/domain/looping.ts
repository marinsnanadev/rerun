import { daysBetween, type ISODate } from '../lib/dates';
import type { Show } from './show';

type CompletedShow = Show & { finishedOn: ISODate };

export interface QueueEntry {
  show: CompletedShow;
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
    .filter(
      (show): show is CompletedShow =>
        show.status === 'looping' && show.finishedOn !== null,
    )
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

/** Keeps one active show up next and moves deferred shows to the top of Coming up. */
export function moveDeferredToComingUp(
  queue: readonly QueueEntry[],
  deferredShowIds: readonly string[],
): QueueEntry[] {
  const deferredEntries: QueueEntry[] = [];
  const seen = new Set<string>();

  for (const id of deferredShowIds) {
    if (seen.has(id)) continue;
    const entry = queue.find((candidate) => candidate.show.id === id);
    if (entry) {
      deferredEntries.push(entry);
      seen.add(id);
    }
  }

  if (deferredEntries.length === 0) return queue.slice();

  const deferredIds = new Set(deferredEntries.map((entry) => entry.show.id));
  const activeEntries = queue.filter((entry) => !deferredIds.has(entry.show.id));
  const firstActive = activeEntries[0];
  const ordered = firstActive
    ? [firstActive, ...deferredEntries, ...activeEntries.slice(1)]
    : deferredEntries;

  return ordered.map((entry, index) => ({ ...entry, position: index + 1 }));
}

/** The show to watch next, or `null` when the rotation is empty. */
export function getUpNext(queue: readonly QueueEntry[]): QueueEntry | null {
  return queue[0] ?? null;
}
