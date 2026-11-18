import { useId, useMemo, useState } from 'react';

import { Button } from '../../components/Button';
import {
  GENRE_LABELS,
  STATUSES,
  STATUS_LABELS,
  isStatus,
  type Show,
  type ShowStatus,
} from '../../domain/show';
import { formatDate } from '../../lib/dates';
import styles from './Library.module.css';

type Filter = 'all' | ShowStatus;

interface LibraryProps {
  shows: readonly Show[];
  onStatusChange(show: Show, status: ShowStatus): Promise<unknown>;
  onEdit(show: Show): void;
  onHistory(show: Show): void;
  onFinish(show: Show): void;
  onRemove(show: Show): Promise<unknown>;
}

export function Library({
  shows,
  onStatusChange,
  onEdit,
  onHistory,
  onFinish,
  onRemove,
}: LibraryProps) {
  const headingId = useId();
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: shows.length,
      currently_watching: 0,
      looping: 0,
      rewatch: 0,
      one_time: 0,
      pondering: 0,
    };
    for (const show of shows) result[show.status] += 1;
    return result;
  }, [shows]);

  const visible = useMemo(
    () =>
      shows
        .filter((show) => filter === 'all' || show.status === filter)
        .sort(
          (a, b) =>
            Number(b.status === 'currently_watching') - Number(a.status === 'currently_watching') ||
            (b.finishedOn ?? '').localeCompare(a.finishedOn ?? '') ||
            a.title.localeCompare(b.title),
        ),
    [shows, filter],
  );

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    ...STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
  ];

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Library
      </h2>

      <div className={styles.filters} role="group" aria-label="Filter by list">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={styles.chip}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label} <span className={styles.count}>{counts[value]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className={styles.empty}>No series in this list yet.</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((show) => (
            <LibraryRow
              key={show.id}
              show={show}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onHistory={onHistory}
              onFinish={onFinish}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface LibraryRowProps {
  show: Show;
  onStatusChange: LibraryProps['onStatusChange'];
  onEdit: LibraryProps['onEdit'];
  onHistory: LibraryProps['onHistory'];
  onFinish: LibraryProps['onFinish'];
  onRemove: LibraryProps['onRemove'];
}

function LibraryRow({
  show,
  onStatusChange,
  onEdit,
  onHistory,
  onFinish,
  onRemove,
}: LibraryRowProps) {
  const selectId = useId();
  const [confirming, setConfirming] = useState(false);

  const when =
    show.status === 'currently_watching'
      ? 'Currently watching'
      : show.startedOn
        ? `${formatDate(show.startedOn)} to ${show.finishedOn ? formatDate(show.finishedOn) : 'not finished'}`
        : show.finishedOn
          ? `Finished ${formatDate(show.finishedOn)}`
          : 'Not finished yet';

  return (
    <li className={styles.row}>
      <div className={styles.info}>
        <p className={styles.title}>{show.title}</p>
        <p className={styles.meta}>
          {GENRE_LABELS[show.genre]}, {when}
          {show.watchCount > 1 && ` · Watched ${show.watchCount} times`}
        </p>
      </div>

      <div className={styles.controls}>
        <label htmlFor={selectId} className="visually-hidden">
          List for {show.title}
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={show.status}
          onChange={(event) => {
            const next = event.target.value;
            if (isStatus(next)) void onStatusChange(show, next);
          }}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <Button variant="ghost" aria-label={`Edit ${show.title}`} onClick={() => onEdit(show)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          aria-label={`History for ${show.title}`}
          onClick={() => onHistory(show)}
        >
          History
        </Button>
        {show.status === 'currently_watching' && (
          <Button variant="secondary" onClick={() => onFinish(show)}>
            Finished it
          </Button>
        )}

        {confirming ? (
          <>
            <Button variant="ghost" className={styles.danger} onClick={() => void onRemove(show)}>
              Confirm remove
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            aria-label={`Remove ${show.title}`}
            onClick={() => setConfirming(true)}
          >
            Remove
          </Button>
        )}
      </div>
    </li>
  );
}
