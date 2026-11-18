import { useId } from 'react';

import { Button } from '../../components/Button';
import { GENRE_LABELS, type Show } from '../../domain/show';
import styles from './CurrentlyWatchingCard.module.css';

interface CurrentlyWatchingCardProps {
  shows: readonly Show[];
  onFinish(show: Show): void;
}

export function CurrentlyWatchingCard({ shows, onFinish }: CurrentlyWatchingCardProps) {
  const headingId = useId();

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Currently watching
      </h2>
      <ul className={styles.list}>
        {shows.map((show) => (
          <li key={show.id} className={styles.row}>
            <div className={styles.info}>
              <h3 className={styles.title}>{show.title}</h3>
              <p className={styles.genre}>{GENRE_LABELS[show.genre]}</p>
            </div>
            <Button
              className={styles.action}
              aria-label={`Mark ${show.title} as finished`}
              onClick={() => onFinish(show)}
            >
              Finished it
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
