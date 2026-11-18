import { useEffect, useRef, type ReactNode } from 'react';

import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  /** The id of the heading that names the dialog. */
  labelledBy: string;
  onClose(): void;
  /** Rendered only while the dialog is open. */
  children: ReactNode;
}

/** A modal dialog built on the native `<dialog>`: focus trapping and Escape come with it. */
export function Modal({ open, labelledBy, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

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
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        // Clicks on the backdrop land on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
