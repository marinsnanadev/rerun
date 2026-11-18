import { useId, useState, type FormEvent } from 'react';

import { errorMessage } from '../../api';
import { Button } from '../../components/Button';
import { Field, controlClassName } from '../../components/Field';
import { Modal } from '../../components/Modal';
import {
  GENRES,
  GENRE_LABELS,
  STATUSES,
  STATUS_OPTION_LABELS,
  type Show,
  type ShowInput,
} from '../../domain/show';
import {
  EMPTY_DRAFT,
  validateShowDraft,
  type ShowDraft,
  type ShowDraftErrors,
} from '../../domain/validation';
import type { ISODate } from '../../lib/dates';
import styles from './ShowFormDialog.module.css';

interface ShowFormDialogProps {
  open: boolean;
  today: ISODate;
  /** The series being edited. Leave out to add a new one. */
  show?: Show | undefined;
  onClose(): void;
  onSubmit(input: ShowInput): Promise<void>;
}

export function ShowFormDialog({ open, today, show, onClose, onSubmit }: ShowFormDialogProps) {
  const headingId = useId();

  return (
    <Modal open={open} labelledBy={headingId} onClose={onClose}>
      {/* Mounted only while open, so every visit starts from a fresh form. */}
      <ShowForm
        headingId={headingId}
        today={today}
        show={show}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

function draftFrom(show: Show): ShowDraft {
  return {
    title: show.title,
    genre: show.genre,
    finishedOn: show.finishedOn,
    startedOn: show.startedOn ?? '',
    status: show.status,
  };
}

interface ShowFormProps {
  headingId: string;
  today: ISODate;
  show: Show | undefined;
  onClose(): void;
  onSubmit(input: ShowInput): Promise<void>;
}

function ShowForm({ headingId, today, show, onClose, onSubmit }: ShowFormProps) {
  const editing = show !== undefined;
  const statusErrorId = useId();

  const [draft, setDraft] = useState<ShowDraft>(show ? draftFrom(show) : EMPTY_DRAFT);
  const [errors, setErrors] = useState<ShowDraftErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  let submitLabel = editing ? 'Save changes' : 'Add series';
  if (pending) submitLabel = editing ? 'Saving…' : 'Adding…';

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
        {editing ? 'Edit series' : 'Add a series'}
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

      {show && show.watchCount > 1 && (
        <p className={styles.hint}>
          These dates are for your most recent watch. Earlier ones are in History.
        </p>
      )}

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
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
