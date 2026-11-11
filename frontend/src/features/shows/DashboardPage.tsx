import { useMemo, useState } from 'react';

import { errorMessage } from '../../api';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { buildQueue, getUpNext } from '../../domain/looping';
import type { Show, ShowStatus } from '../../domain/show';
import type { ISODate } from '../../lib/dates';
import { AddShowDialog } from './AddShowDialog';
import styles from './DashboardPage.module.css';
import { Library } from './Library';
import { QueueList } from './QueueList';
import { UpNextCard } from './UpNextCard';
import { useShows } from './useShows';
import { useToday } from './useToday';

export function DashboardPage() {
  const today = useToday();
  const { shows, status, error, retry, add, update, remove } = useShows();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const queue = useMemo(() => buildQueue(shows, today), [shows, today]);
  const upNext = getUpNext(queue);

  /** Runs a change, shows any error, and reports whether it worked. */
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setActionError(errorMessage(caught));
      return false;
    }
  }

  const logFinished = (show: Show, date: ISODate) =>
    run(() => update(show.id, { finishedOn: date, startedOn: null }));

  const changeStatus = (show: Show, next: ShowStatus) =>
    run(() => update(show.id, { status: next }));

  const removeShow = (show: Show) => run(() => remove(show.id));

  function renderContent() {
    if (status === 'loading') {
      return (
        <p className={styles.note} role="status">
          Loading your series…
        </p>
      );
    }

    if (status === 'error') {
      return (
        <div className={styles.alert} role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        </div>
      );
    }

    if (shows.length === 0) {
      return (
        <section className={styles.panel}>
          <h2 className={styles.panelHeading}>Add your first series</h2>
          <p className={styles.note}>
            Start with the ones you keep coming back to. Add them to looping and Rerun will keep
            the order for you.
          </p>
          <Button onClick={() => setDialogOpen(true)}>Add series</Button>
        </section>
      );
    }

    return (
      <div className={styles.grid}>
        <div className={styles.rotation}>
          {upNext ? (
            <>
              <section aria-label="Up next">
                <UpNextCard
                  key={upNext.show.id}
                  entry={upNext}
                  today={today}
                  onFinished={(date) => logFinished(upNext.show, date)}
                />
              </section>
              <QueueList entries={queue.slice(1)} />
            </>
          ) : (
            <section className={styles.panel}>
              <h2 className={styles.panelHeading}>Nothing in your rotation yet</h2>
              <p className={styles.note}>
                Set a series to Looping in your library and it will show up here.
              </p>
            </section>
          )}
        </div>

        <Library shows={shows} onStatusChange={changeStatus} onRemove={removeShow} />
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Your rotation</h1>
          <Button onClick={() => setDialogOpen(true)}>Add series</Button>
        </div>

        {actionError && (
          <p className={styles.alert} role="alert">
            {actionError}
          </p>
        )}

        {renderContent()}
      </main>

      <AddShowDialog
        open={dialogOpen}
        today={today}
        onClose={() => setDialogOpen(false)}
        onSubmit={add}
      />
    </>
  );
}
