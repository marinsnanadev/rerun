import { useMemo } from 'react';

import { buildQueue } from '../../domain/looping';
import type { Show } from '../../domain/show';
import { addDays, describeDaysAgo, todayISO } from '../../lib/dates';
import styles from './RotationPreview.module.css';

const EXAMPLES = [
  { title: 'Community', daysAgo: 45 },
  { title: 'The Office', daysAgo: 120 },
  { title: 'Modern Family', daysAgo: 80 },
];

/** A small, static example of how the rotation orders series. */
export function RotationPreview() {
  const queue = useMemo(() => {
    const today = todayISO();
    const shows: Show[] = EXAMPLES.map(({ title, daysAgo }) => ({
      id: title,
      title,
      genre: 'comedy',
      status: 'looping',
      startedOn: null,
      finishedOn: addDays(today, -daysAgo),
    }));
    return buildQueue(shows, today);
  }, []);

  return (
    <figure className={styles.figure}>
      <ol className={styles.list}>
        {queue.map((entry) => (
          <li key={entry.show.id} className={styles.row} data-next={entry.position === 1}>
            <span className={styles.position}>{entry.position}</span>
            <span className={styles.title}>{entry.show.title}</span>
            <span className={styles.when}>{describeDaysAgo(entry.daysSince)}</span>
          </li>
        ))}
      </ol>
      <figcaption className={styles.caption}>
        An example rotation. The series you’ve gone longest without comes first.
      </figcaption>
    </figure>
  );
}
