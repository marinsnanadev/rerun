/**
 * In-browser stand-in for the backend, used with `VITE_API_MOCK=true`.
 * Development only: passwords are kept in localStorage in plain text.
 */
import type { Show, ShowInput } from '../domain/show';
import { addDays, todayISO } from '../lib/dates';
import { ApiError } from './errors';
import type { ApiClient, Credentials, ShowPatch, User } from './types';

const USERS_KEY = 'rerun.mock.users';
const SESSION_KEY = 'rerun.mock.session';
const SHOWS_KEY = 'rerun.mock.shows';
const LATENCY_MS = 120;

interface StoredUser extends User {
  password: string;
}

type ShowsByUser = Record<string, Show[]>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
}

interface SampleShow extends Pick<Show, 'title' | 'genre' | 'status'> {
  daysAgo: number;
}

const SAMPLE_SHOWS: readonly SampleShow[] = [
  { title: 'The Office', genre: 'comedy', status: 'looping', daysAgo: 120 },
  { title: 'Modern Family', genre: 'comedy', status: 'looping', daysAgo: 80 },
  { title: 'Community', genre: 'comedy', status: 'looping', daysAgo: 45 },
  { title: 'Severance', genre: 'drama', status: 'rewatch', daysAgo: 200 },
  { title: 'Dark', genre: 'sci_fi', status: 'pondering', daysAgo: 300 },
];

function sampleShows(): Show[] {
  const today = todayISO();

  return SAMPLE_SHOWS.map(({ daysAgo, ...rest }) => ({
    id: crypto.randomUUID(),
    startedOn: null,
    finishedOn: addDays(today, -daysAgo),
    ...rest,
  }));
}

function currentUser(): StoredUser {
  const id = read<string | null>(SESSION_KEY, null);
  const user = read<StoredUser[]>(USERS_KEY, []).find((candidate) => candidate.id === id);
  if (!user) throw new ApiError(401, 'Sign in to continue.');
  return user;
}

function publicUser({ id, username }: StoredUser): User {
  return { id, username };
}

function validateCredentials({ username, password }: Credentials): string {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
    throw new ApiError(422, 'Usernames use 3 to 32 letters, numbers, dots, dashes or underscores.');
  }
  if (password.length < 8) {
    throw new ApiError(422, 'Use at least 8 characters for your password.');
  }
  return normalized;
}

function readShows(userId: string): Show[] {
  return read<ShowsByUser>(SHOWS_KEY, {})[userId] ?? [];
}

function writeShows(userId: string, shows: Show[]): void {
  write(SHOWS_KEY, { ...read<ShowsByUser>(SHOWS_KEY, {}), [userId]: shows });
}

export function createMockClient(): ApiClient {
  return {
    auth: {
      async register(credentials) {
        await wait();
        const username = validateCredentials(credentials);
        const users = read<StoredUser[]>(USERS_KEY, []);
        if (users.some((user) => user.username === username)) {
          throw new ApiError(409, 'That username is taken.');
        }

        const user: StoredUser = { id: crypto.randomUUID(), username, password: credentials.password };
        write(USERS_KEY, [...users, user]);
        writeShows(user.id, sampleShows());
        write(SESSION_KEY, user.id);
        return publicUser(user);
      },

      async login({ username, password }) {
        await wait();
        const user = read<StoredUser[]>(USERS_KEY, []).find(
          (candidate) =>
            candidate.username === username.trim().toLowerCase() && candidate.password === password,
        );
        if (!user) throw new ApiError(401, 'Incorrect username or password.');

        write(SESSION_KEY, user.id);
        return publicUser(user);
      },

      async logout() {
        await wait();
        localStorage.removeItem(SESSION_KEY);
      },

      async me() {
        await wait();
        return publicUser(currentUser());
      },
    },

    shows: {
      async list() {
        await wait();
        return readShows(currentUser().id);
      },

      async create(input: ShowInput) {
        await wait();
        const { id: userId } = currentUser();
        const show: Show = { id: crypto.randomUUID(), ...input };
        writeShows(userId, [...readShows(userId), show]);
        return show;
      },

      async update(id: string, patch: ShowPatch) {
        await wait();
        const { id: userId } = currentUser();
        const shows = readShows(userId);
        const existing = shows.find((show) => show.id === id);
        if (!existing) throw new ApiError(404, 'That series no longer exists.');

        const updated: Show = { ...existing, ...patch };
        writeShows(
          userId,
          shows.map((show) => (show.id === id ? updated : show)),
        );
        return updated;
      },

      async remove(id: string) {
        await wait();
        const { id: userId } = currentUser();
        writeShows(
          userId,
          readShows(userId).filter((show) => show.id !== id),
        );
      },
    },
  };
}
