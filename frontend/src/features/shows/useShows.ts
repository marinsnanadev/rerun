import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage, type ShowPatch } from '../../api';
import type { Show, ShowInput } from '../../domain/show';

type LoadStatus = 'loading' | 'ready' | 'error';

/** Loads the signed-in user's series and keeps the list in sync after changes. */
export function useShows() {
  const [shows, setShows] = useState<Show[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);

    api.shows
      .list()
      .then((loaded) => {
        if (!active) return;
        setShows(loaded);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(errorMessage(caught, 'Couldn’t load your series.'));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  const add = useCallback(async (input: ShowInput) => {
    const created = await api.shows.create(input);
    setShows((current) => [...current, created]);
  }, []);

  const update = useCallback(async (id: string, patch: ShowPatch) => {
    const updated = await api.shows.update(id, patch);
    setShows((current) => current.map((show) => (show.id === id ? updated : show)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.shows.remove(id);
    setShows((current) => current.filter((show) => show.id !== id));
  }, []);

  return { shows, status, error, retry, add, update, remove };
}
