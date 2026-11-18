import { useId, useState, type FormEvent } from 'react';

import { errorMessage } from '../../api';
import { Button } from '../../components/Button';
import { Field, controlClassName } from '../../components/Field';
import { Modal } from '../../components/Modal';
import {
  FINISHED_STATUSES,
  STATUS_LABELS,
  type FinishedShowStatus,
  isFinishedStatus,
  type Show,
} from '../../domain/show';
import { isISODate, type ISODate } from '../../lib/dates';
import styles from './FinishShowDialog.module.css';

interface FinishShowDialogProps {
  show: Show | null;
  today: ISODate;
  onClose(): void;
  onFinish(show: Show, date: ISODate, status?: FinishedShowStatus): Promise<void>;
}

export function FinishShowDialog({ show, today, onClose, onFinish }: FinishShowDialogProps) {
  const headingId = useId();

  return (
    <Modal open={show !== null} labelledBy={headingId} onClose={onClose}>
      {show && (
        <FinishForm
          key={show.id}
          headingId={headingId}
          show={show}
          today={today}
          onClose={onClose}
          onFinish={onFinish}
        />
      )}
    </Modal>
  );
}

interface FinishFormProps extends Omit<FinishShowDialogProps, 'show'> {
  headingId: string;
  show: Show;
}

function FinishForm({ headingId, show, today, onClose, onFinish }: FinishFormProps) {
  const needsClassification = show.status === 'currently_watching';
  const [finishedOn, setFinishedOn] = useState(today);
  const [status, setStatus] = useState<FinishedShowStatus | ''>(
    isFinishedStatus(show.status) ? show.status : '',
  );
  const [dateError, setDateError] = useState<string | undefined>();
  const [statusError, setStatusError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    let nextDateError: string | undefined;
    if (!isISODate(finishedOn) || finishedOn > today) {
      nextDateError = 'Choose a valid date that is not in the future.';
    }
    const nextStatusError =
      needsClassification && status === '' ? 'Choose a list for this series.' : undefined;
    setDateError(nextDateError);
    setStatusError(nextStatusError);

    if (nextDateError || nextStatusError) return;

    setPending(true);
    try {
      await onFinish(
        show,
        finishedOn,
        needsClassification && status !== '' ? status : undefined,
      );
      onClose();
    } catch (caught) {
      setSubmitError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div>
        <h2 id={headingId} className={styles.heading}>
          Finish watching
        </h2>
        <p className={styles.description}>{show.title}</p>
      </div>

      <Field label="Finished on" error={dateError}>
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            type="date"
            max={today}
            value={finishedOn}
            onChange={(event) => {
              setFinishedOn(event.target.value);
              setDateError(undefined);
            }}
          />
        )}
      </Field>

      {needsClassification && (
        <Field label="Move to" error={statusError}>
          {(control) => (
            <select
              {...control}
              className={controlClassName}
              value={status}
              onChange={(event) => {
                const next = event.target.value;
                setStatus(isFinishedStatus(next) ? next : '');
                setStatusError(undefined);
              }}
            >
              <option value="">Choose a list</option>
              {FINISHED_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {submitError && (
        <p className={styles.alert} role="alert">
          {submitError}
        </p>
      )}

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" busy={pending}>
          {pending ? 'Saving…' : 'Confirm finished'}
        </Button>
      </div>
    </form>
  );
}
