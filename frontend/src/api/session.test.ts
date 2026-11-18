import { describe, expect, it, vi } from 'vitest';

import { ApiError } from './errors';
import { onSessionExpired, withSessionExpiry } from './session';
import type { ApiClient } from './types';

function clientFailingWith(status: number): ApiClient {
  const fail = () => Promise.reject(new ApiError(status, 'nope'));
  return {
    auth: { register: fail, login: fail, logout: fail, me: fail },
    shows: { list: fail, create: fail, update: fail, remove: fail },
    watches: { list: fail, add: fail, remove: fail },
  };
}

describe('withSessionExpiry', () => {
  it('announces an expired session when a call that needs one returns 401', async () => {
    const listener = vi.fn();
    const stop = onSessionExpired(listener);
    const client = withSessionExpiry(clientFailingWith(401));

    await expect(client.shows.list()).rejects.toMatchObject({ status: 401 });
    await expect(client.watches.add('a', { startedOn: null, finishedOn: '2026-01-01' })).rejects.toBeInstanceOf(ApiError);

    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stays quiet for other errors', async () => {
    const listener = vi.fn();
    const stop = onSessionExpired(listener);
    const client = withSessionExpiry(clientFailingWith(404));

    await expect(client.shows.remove('a')).rejects.toMatchObject({ status: 404 });

    expect(listener).not.toHaveBeenCalled();
    stop();
  });

  it('does not treat a failed sign in as an expired session', async () => {
    const listener = vi.fn();
    const stop = onSessionExpired(listener);
    const client = withSessionExpiry(clientFailingWith(401));

    await expect(client.auth.login({ username: 'a', password: 'b' })).rejects.toBeInstanceOf(ApiError);
    await expect(client.auth.register({ username: 'a', password: 'b' })).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
    stop();
  });

  it('stops notifying after unsubscribing', async () => {
    const listener = vi.fn();
    onSessionExpired(listener)();
    const client = withSessionExpiry(clientFailingWith(401));

    await expect(client.auth.me()).rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
  });
});
