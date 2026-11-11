import { useId } from 'react';

import type { QueueEntry } from '../../domain/looping';
import { GENRE_LABELS } from '../../domain/show';
import { describeDaysAgo, formatDate } from '../../lib/dates';
import styles from './QueueList.module.css';

interface QueueListProps {
  /** Everything in the rotation after the series that is up next. */
  entries: readonly QueueEntry[];
}

export function QueueList({ entries }: QueueListProps) {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Coming up
      </h2>

      {entries.length === 0 ? (
        <p className={styles.empty}>
          Add more series to looping to build out your rotation.
        </p>
      ) : (
        <ol className={styles.list}>
          {entries.map(({ show, daysSince, position }) => (
            <li key={show.id} className={styles.row}>
              <span className={styles.position}>{position}</span>
              <div>
                <p className={styles.title}>{show.title}</p>
                <p className={styles.meta}>
                  {GENRE_LABELS[show.genre]}, finished {formatDate(show.finishedOn)}
                </p>
              </div>
              <span className={styles.when}>{describeDaysAgo(daysSince)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
