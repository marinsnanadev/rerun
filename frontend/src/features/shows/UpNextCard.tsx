import { useId } from 'react';

import { Button } from '../../components/Button';
import type { QueueEntry } from '../../domain/looping';
import { GENRE_LABELS } from '../../domain/show';
import { describeDaysAgo, formatDate } from '../../lib/dates';
import styles from './UpNextCard.module.css';

interface UpNextCardProps {
  entry: QueueEntry;
  onStartWatching(): void;
  onNotNow(): void;
}

export function UpNextCard({ entry, onStartWatching, onNotNow }: UpNextCardProps) {
  const { show, daysSince } = entry;
  const titleId = useId();

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <h2 className={styles.heading}>Up next</h2>
      <h3 id={titleId} className={styles.title}>
        {show.title}
      </h3>

      <dl className={styles.details}>
        <div>
          <dt>Genre</dt>
          <dd>{GENRE_LABELS[show.genre]}</dd>
        </div>
        <div>
          <dt>Last finished</dt>
          <dd>
            {formatDate(show.finishedOn)}, {describeDaysAgo(daysSince)}
          </dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Button className={styles.action} onClick={onStartWatching}>
          Start watching
        </Button>
        <Button variant="ghost" className={styles.notNow} onClick={onNotNow}>
          Not now
        </Button>
      </div>
    </article>
  );
}
