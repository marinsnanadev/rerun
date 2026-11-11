import { useId, type ReactNode } from 'react';

import styles from './Field.module.css';

/** Class for text inputs, selects and date inputs so they all look the same. */
export const controlClassName = styles.control;

interface ControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | undefined;
  optional?: boolean;
  children: (control: ControlProps) => ReactNode;
}

/** A label, a control and its hint or error, wired together for assistive tech. */
export function Field({ label, hint, error, optional = false, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
