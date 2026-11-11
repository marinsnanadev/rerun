import { useId, useState, type FormEvent } from 'react';

import { Button } from '../../components/Button';
import type { QueueEntry } from '../../domain/looping';
import { GENRE_LABELS } from '../../domain/show';
import { describeDaysAgo, formatDate, isISODate, type ISODate } from '../../lib/dates';
import styles from './UpNextCard.module.css';

interface UpNextCardProps {
  entry: QueueEntry;
  today: ISODate;
  /** Resolves to `true` when the new finish date was saved. */
  onFinished(date: ISODate): Promise<boolean>;
}

export function UpNextCard({ entry, today, onFinished }: UpNextCardProps) {
  const { show, daysSince } = entry;
  const titleId = useId();
  const dateId = useId();

  const [logging, setLogging] = useState(false);
  const [date, setDate] = useState<ISODate>(today);
  const [pending, setPending] = useState(false);

  const isValid = isISODate(date) && date <= today;

  function startLogging() {
    setDate(today);
    setLogging(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setPending(true);
    try {
      if (await onFinished(date)) setLogging(false);
    } finally {
      setPending(false);
    }
  }

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

      {logging ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.dateField}>
            <label htmlFor={dateId}>Finished on</label>
            <input
              id={dateId}
              className={styles.dateInput}
              type="date"
              value={date}
              max={today}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <div className={styles.actions}>
            <Button type="submit" className={styles.action} busy={pending} disabled={!isValid}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
            <Button className={styles.cancel} onClick={() => setLogging(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button className={styles.action} onClick={startLogging}>
          Finished it
        </Button>
      )}
    </article>
  );
}
