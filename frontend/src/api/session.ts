import { ApiError } from './errors';
import type { ApiClient } from './types';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Calls `listener` whenever the server says the session is gone. Returns an unsubscribe function. */
export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  for (const listener of [...listeners]) listener();
}

function guarded<Args extends unknown[], Result>(call: (...args: Args) => Promise<Result>) {
  return async (...args: Args): Promise<Result> => {
    try {
      return await call(...args);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) notifySessionExpired();
      throw caught;
    }
  };
}

/**
 * Wraps a client so that a 401 from any call that needs a session announces that the session
 * expired. Signing in and registering are left alone: a 401 there only means a wrong password.
 */
export function withSessionExpiry(client: ApiClient): ApiClient {
  return {
    auth: {
      register: client.auth.register,
      login: client.auth.login,
      logout: guarded(client.auth.logout),
      me: guarded(client.auth.me),
    },
    shows: {
      list: guarded(client.shows.list),
      create: guarded(client.shows.create),
      update: guarded(client.shows.update),
      remove: guarded(client.shows.remove),
    },
    watches: {
      list: guarded(client.watches.list),
      add: guarded(client.watches.add),
      remove: guarded(client.watches.remove),
    },
  };
}
