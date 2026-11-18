import { useId } from 'react';

import { Button } from '../../components/Button';
import type { QueueEntry } from '../../domain/looping';
import { GENRE_LABELS } from '../../domain/show';
import { describeDaysAgo, formatDate } from '../../lib/dates';
import styles from './UpNextCard.module.css';

interface UpNextCardProps {
  entry: QueueEntry;
  onFinished(): void;
}

export function UpNextCard({ entry, onFinished }: UpNextCardProps) {
  const { show, daysSince } = entry;
  const titleId = useId();

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <p className={styles.kicker}>Up next</p>
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

      <Button className={styles.action} onClick={onFinished}>
        Finished it
      </Button>
    </article>
  );
}
