import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { errorMessage } from '../../api';
import { Button } from '../../components/Button';
import { Field, controlClassName } from '../../components/Field';
import {
  GENRES,
  GENRE_LABELS,
  STATUSES,
  STATUS_OPTION_LABELS,
  type ShowInput,
} from '../../domain/show';
import {
  EMPTY_DRAFT,
  validateShowDraft,
  type ShowDraft,
  type ShowDraftErrors,
} from '../../domain/validation';
import type { ISODate } from '../../lib/dates';
import styles from './AddShowDialog.module.css';

interface AddShowDialogProps {
  open: boolean;
  today: ISODate;
  onClose(): void;
  onSubmit(input: ShowInput): Promise<void>;
}

export function AddShowDialog({ open, today, onClose, onSubmit }: AddShowDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={headingId}
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the backdrop land on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Mounted only while open, so every visit starts with an empty form. */}
      {open && (
        <AddShowForm headingId={headingId} today={today} onClose={onClose} onSubmit={onSubmit} />
      )}
    </dialog>
  );
}

interface AddShowFormProps {
  headingId: string;
  today: ISODate;
  onClose(): void;
  onSubmit(input: ShowInput): Promise<void>;
}

function AddShowForm({ headingId, today, onClose, onSubmit }: AddShowFormProps) {
  const statusErrorId = useId();

  const [draft, setDraft] = useState<ShowDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<ShowDraftErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function change(key: keyof ShowDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const result = validateShowDraft(draft, today);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setPending(true);
    try {
      await onSubmit(result.value);
      onClose();
    } catch (caught) {
      setSubmitError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 id={headingId} className={styles.heading}>
        Add a series
      </h2>

      <Field label="Title" error={errors.title}>
        {(control) => (
          <input
            {...control}
            className={controlClassName}
            value={draft.title}
            onChange={(event) => change('title', event.target.value)}
            autoComplete="off"
          />
        )}
      </Field>

      <Field label="Genre" error={errors.genre}>
        {(control) => (
          <select
            {...control}
            className={controlClassName}
            value={draft.genre}
            onChange={(event) => change('genre', event.target.value)}
          >
            <option value="">Choose a genre</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {GENRE_LABELS[genre]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className={styles.dates}>
        <Field label="Finished watching" error={errors.finishedOn}>
          {(control) => (
            <input
              {...control}
              className={controlClassName}
              type="date"
              max={today}
              value={draft.finishedOn}
              onChange={(event) => change('finishedOn', event.target.value)}
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
              value={draft.startedOn}
              onChange={(event) => change('startedOn', event.target.value)}
            />
          )}
        </Field>
      </div>

      <fieldset
        className={styles.fieldset}
        aria-describedby={errors.status ? statusErrorId : undefined}
      >
        <legend className={styles.legend}>Where does it go?</legend>
        <div className={styles.options}>
          {STATUSES.map((status) => (
            <label key={status} className={styles.option}>
              <input
                className="visually-hidden"
                type="radio"
                name="status"
                value={status}
                checked={draft.status === status}
                onChange={() => change('status', status)}
              />
              <span>{STATUS_OPTION_LABELS[status]}</span>
            </label>
          ))}
        </div>
        {errors.status && (
          <p id={statusErrorId} className={styles.error}>
            {errors.status}
          </p>
        )}
      </fieldset>

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
          {pending ? 'Adding…' : 'Add series'}
        </Button>
      </div>
    </form>
  );
}
