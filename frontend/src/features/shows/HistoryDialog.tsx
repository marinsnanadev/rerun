import { useEffect, useId, useState, type FormEvent } from 'react';

import { api, errorMessage } from '../../api';
import { Button } from '../../components/Button';
import { Field, controlClassName } from '../../components/Field';
import { Modal } from '../../components/Modal';
import type { Show, Watch, WatchInput } from '../../domain/show';
import { formatDate, isISODate, type ISODate } from '../../lib/dates';
import styles from './HistoryDialog.module.css';

interface HistoryDialogProps {
  /** The series whose history is open, or `null` while the dialog is closed. */
  show: Show | null;
  today: ISODate;
  onClose(): void;
  onAddWatch(showId: string, input: WatchInput): Promise<void>;
  onRemoveWatch(showId: string, watchId: string): Promise<void>;
}

export function HistoryDialog({
  show,
  today,
  onClose,
  onAddWatch,
  onRemoveWatch,
}: HistoryDialogProps) {
  const headingId = useId();

  return (
    <Modal open={show !== null} labelledBy={headingId} onClose={onClose}>
      {show && (
        <History
          key={show.id}
          headingId={headingId}
          show={show}
          today={today}
          onClose={onClose}
          onAddWatch={onAddWatch}
          onRemoveWatch={onRemoveWatch}
        />
      )}
    </Modal>
  );
}

type Loaded =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; watches: Watch[] };

interface HistoryProps extends Omit<HistoryDialogProps, 'show'> {
  headingId: string;
  show: Show;
}

function describeWatch({ startedOn, finishedOn }: Watch): string {
  return startedOn
    ? `${formatDate(startedOn)} to ${formatDate(finishedOn)}`
    : `Finished ${formatDate(finishedOn)}`;
}

function History({ headingId, show, today, onClose, onAddWatch, onRemoveWatch }: HistoryProps) {
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const showId = show.id;

  function loadWatches(): Promise<Watch[]> {
    return api.watches.list(showId);
  }

  useEffect(() => {
    let active = true;

    api.watches
      .list(showId)
      .then((watches) => {
        if (active) setLoaded({ status: 'ready', watches });
      })
      .catch((caught: unknown) => {
        if (active) {
          setLoaded({ status: 'error', message: errorMessage(caught, 'Couldn’t load the history.') });
        }
      });

    return () => {
      active = false;
    };
  }, [showId]);

  async function handleAdd(input: WatchInput): Promise<void> {
    await onAddWatch(showId, input);
    setLoaded({ status: 'ready', watches: await loadWatches() });
  }

  async function handleRemove(watch: Watch) {
    setActionError(null);
    setBusyId(watch.id);
    try {
      await onRemoveWatch(showId, watch.id);
      setLoaded({ status: 'ready', watches: await loadWatches() });
      setConfirmingId(null);
    } catch (caught) {
      setActionError(errorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  const watches = loaded.status === 'ready' ? loaded.watches : [];
  const count = loaded.status === 'ready' ? watches.length : show.watchCount;

  return (
    <div className={styles.content}>
      <div>
        <h2 id={headingId} className={styles.heading}>
          {show.title}
        </h2>
        <p className={styles.subtitle}>{count === 1 ? 'Watched once' : `Watched ${count} times`}</p>
      </div>

      {loaded.status === 'loading' && (
        <p className={styles.note} role="status">
          Loading history…
        </p>
      )}

      {loaded.status === 'error' && (
        <p className={styles.alert} role="alert">
          {loaded.message}
        </p>
      )}

      {loaded.status === 'ready' && (
        <ol className={styles.list}>
          {watches.map((watch, index) => (
            <li key={watch.id} className={styles.item}>
              <div className={styles.when}>
                <span>{describeWatch(watch)}</span>
                {index === 0 && <span className={styles.badge}>Latest</span>}
              </div>

              {watches.length > 1 &&
                (confirmingId === watch.id ? (
                  <div className={styles.actions}>
                    <Button
                      variant="ghost"
                      className={styles.danger}
                      busy={busyId === watch.id}
                      onClick={() => void handleRemove(watch)}
                    >
                      Confirm remove
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busyId === watch.id}
                      onClick={() => setConfirmingId(null)}
                    >
                      Keep
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    aria-label={`Remove the watch from ${describeWatch(watch)}`}
                    onClick={() => setConfirmingId(watch.id)}
                  >
                    Remove
                  </Button>
                ))}
            </li>
          ))}
        </ol>
      )}

      {actionError && (
        <p className={styles.alert} role="alert">
          {actionError}
        </p>
      )}

      <AddWatchForm today={today} onAdd={handleAdd} />

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

interface AddWatchFormProps {
  today: ISODate;
  onAdd(input: WatchInput): Promise<void>;
}

/** Logs a watch from another time, such as one from before you started using Rerun. */
function AddWatchForm({ today, onAdd }: AddWatchFormProps) {
  const [finishedOn, setFinishedOn] = useState('');
  const [startedOn, setStartedOn] = useState('');
  const [errors, setErrors] = useState<{ finishedOn?: string; startedOn?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const next: { finishedOn?: string; startedOn?: string } = {};
    if (!isISODate(finishedOn)) {
      next.finishedOn = 'Choose the date you finished watching.';
    } else if (finishedOn > today) {
      next.finishedOn = 'The finish date can’t be in the future.';
    }

    if (startedOn !== '') {
      if (!isISODate(startedOn)) {
        next.startedOn = 'Enter a valid date.';
      } else if (startedOn > today) {
        next.startedOn = 'The start date can’t be in the future.';
      } else if (isISODate(finishedOn) && startedOn > finishedOn) {
        next.startedOn = 'The start date must be on or before the finish date.';
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      await onAdd({ finishedOn, startedOn: startedOn === '' ? null : startedOn });
      setFinishedOn('');
      setStartedOn('');
    } catch (caught) {
      setSubmitError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit} noValidate>
      <h3 className={styles.subheading}>Log another watch</h3>

      <div className={styles.dates}>
        <Field label="Finished watching" error={errors.finishedOn}>
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              type="date"
              max={today}
              value={finishedOn}
              onChange={(event) => setFinishedOn(event.target.value)}
            />
          )}
        </Field>

        <Field label="Started watching" optional error={errors.startedOn}>
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              type="date"
              max={today}
              value={startedOn}
              onChange={(event) => setStartedOn(event.target.value)}
            />
          )}
        </Field>
      </div>

      {submitError && (
        <p className={styles.alert} role="alert">
          {submitError}
        </p>
      )}

      <div>
        <Button type="submit" variant="secondary" busy={pending}>
          {pending ? 'Adding…' : 'Add watch'}
        </Button>
      </div>
    </form>
  );
}
