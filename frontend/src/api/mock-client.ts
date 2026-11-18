/**
 * In-browser stand-in for the backend, used with `VITE_API_MOCK=true`.
 * Development only: passwords are kept in localStorage in plain text.
 */
import type { Show, ShowInput, Watch } from '../domain/show';
import { addDays, todayISO } from '../lib/dates';
import { ApiError } from './errors';
import type { ApiClient, Credentials, ShowPatch, User } from './types';

const USERS_KEY = 'rerun.mock.users';
const SESSION_KEY = 'rerun.mock.session';
const SHOWS_KEY = 'rerun.mock.shows';
const WATCHES_KEY = 'rerun.mock.watches';
const LATENCY_MS = 120;

interface StoredUser extends User {
  password: string;
}

/** A show as saved. `watchCount` is worked out from its watches whenever it is read. */
type StoredShow = Omit<Show, 'watchCount'>;

type ShowsByUser = Record<string, StoredShow[]>;
type WatchesByShow = Record<string, Watch[]>;

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
  /** An earlier watch, so the history has something to show. */
  earlierDaysAgo?: number;
}

const SAMPLE_SHOWS: readonly SampleShow[] = [
  { title: 'The Office', genre: 'comedy', status: 'looping', daysAgo: 120, earlierDaysAgo: 420 },
  { title: 'Modern Family', genre: 'comedy', status: 'looping', daysAgo: 80 },
  { title: 'Community', genre: 'comedy', status: 'looping', daysAgo: 45 },
  { title: 'Severance', genre: 'drama', status: 'rewatch', daysAgo: 200 },
  { title: 'Dark', genre: 'sci_fi', status: 'pondering', daysAgo: 300 },
];

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

function readShows(userId: string): StoredShow[] {
  return read<ShowsByUser>(SHOWS_KEY, {})[userId] ?? [];
}

function writeShows(userId: string, shows: StoredShow[]): void {
  write(SHOWS_KEY, { ...read<ShowsByUser>(SHOWS_KEY, {}), [userId]: shows });
}

function readWatches(): WatchesByShow {
  return read<WatchesByShow>(WATCHES_KEY, {});
}

/** Shows saved before watches existed have none stored, so their dates stand in for one. */
function watchesOf(show: StoredShow, all: WatchesByShow): Watch[] {
  return (
    all[show.id] ??
    (show.finishedOn
      ? [{ id: show.id, startedOn: show.startedOn, finishedOn: show.finishedOn }]
      : [])
  );
}

/** The watch finished last. When two share a day, the one added later wins. */
function latestOf(watches: readonly Watch[]): Watch {
  return watches.reduce((best, watch) => (watch.finishedOn >= best.finishedOn ? watch : best));
}

/** A show's own dates always mirror its latest watch. */
function withLatestDates(show: StoredShow, watches: readonly Watch[]): StoredShow {
  if (watches.length === 0) return { ...show, startedOn: null, finishedOn: null };
  const latest = latestOf(watches);
  return { ...show, startedOn: latest.startedOn, finishedOn: latest.finishedOn };
}

function present(show: StoredShow, watches: readonly Watch[]): Show {
  return { ...show, watchCount: watches.length };
}

function seedSamples(userId: string): void {
  const today = todayISO();
  const allWatches = readWatches();

  const shows = SAMPLE_SHOWS.map(({ daysAgo, earlierDaysAgo, ...rest }): StoredShow => {
    const id = crypto.randomUUID();
    const watches: Watch[] = [];

    if (earlierDaysAgo !== undefined) {
      watches.push({
        id: crypto.randomUUID(),
        startedOn: null,
        finishedOn: addDays(today, -earlierDaysAgo),
      });
    }
    watches.push({ id: crypto.randomUUID(), startedOn: null, finishedOn: addDays(today, -daysAgo) });
    allWatches[id] = watches;

    return { id, startedOn: null, finishedOn: addDays(today, -daysAgo), ...rest };
  });

  write(WATCHES_KEY, allWatches);
  writeShows(userId, shows);
}

/** The signed-in user's show, with the context needed to save changes to it. */
function loadShow(showId: string) {
  const { id: userId } = currentUser();
  const shows = readShows(userId);
  const show = shows.find((candidate) => candidate.id === showId);
  if (!show) throw new ApiError(404, 'That series no longer exists.');

  const allWatches = readWatches();
  return { userId, shows, show, allWatches, watches: watchesOf(show, allWatches) };
}

function saveWatches(
  userId: string,
  shows: StoredShow[],
  show: StoredShow,
  allWatches: WatchesByShow,
  watches: Watch[],
): Show {
  const updated = withLatestDates(show, watches);
  write(WATCHES_KEY, { ...allWatches, [show.id]: watches });
  writeShows(
    userId,
    shows.map((candidate) => (candidate.id === show.id ? updated : candidate)),
  );
  return present(updated, watches);
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
        seedSamples(user.id);
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
        const allWatches = readWatches();
        return readShows(currentUser().id).map((show) =>
          present(show, watchesOf(show, allWatches)),
        );
      },

      async create(input: ShowInput) {
        await wait();
        const { id: userId } = currentUser();
        const show: StoredShow = { id: crypto.randomUUID(), ...input };
        const watches: Watch[] = input.finishedOn
          ? [
              {
                id: crypto.randomUUID(),
                startedOn: input.startedOn,
                finishedOn: input.finishedOn,
              },
            ]
          : [];

        writeShows(userId, [...readShows(userId), show]);
        write(WATCHES_KEY, { ...readWatches(), [show.id]: watches });
        return present(show, watches);
      },

      async update(id: string, patch: ShowPatch) {
        await wait();
        const { userId, shows, show, allWatches, watches } = loadShow(id);
        const changed: StoredShow = { ...show, ...patch };

        if (
          changed.status === 'currently_watching' &&
          'startedOn' in patch &&
          !('finishedOn' in patch)
        ) {
          writeShows(
            userId,
            shows.map((candidate) => (candidate.id === id ? changed : candidate)),
          );
          return present(changed, watches);
        }

        // Editing dates corrects the latest watch, or records the first one.
        if ('startedOn' in patch || 'finishedOn' in patch) {
          if (watches.length === 0) {
            const finishedOn = changed.finishedOn;
            if (finishedOn === null) {
              writeShows(
                userId,
                shows.map((candidate) => (candidate.id === id ? changed : candidate)),
              );
              return present(changed, watches);
            }
            const first: Watch = {
              id: crypto.randomUUID(),
              startedOn: changed.startedOn,
              finishedOn,
            };
            return saveWatches(userId, shows, changed, allWatches, [first]);
          }
          const finishedOn = changed.finishedOn;
          if (finishedOn === null) {
            throw new ApiError(422, 'A finish date can’t be cleared while watch history exists.');
          }
          const latest = latestOf(watches);
          const corrected = watches.map((watch) =>
            watch === latest
              ? { ...watch, startedOn: changed.startedOn, finishedOn }
              : watch,
          );
          return saveWatches(userId, shows, changed, allWatches, corrected);
        }

        writeShows(
          userId,
          shows.map((candidate) => (candidate.id === id ? changed : candidate)),
        );
        return present(changed, watches);
      },

      async remove(id: string) {
        await wait();
        const { id: userId } = currentUser();
        const remainingWatches = Object.fromEntries(
          Object.entries(readWatches()).filter(([showId]) => showId !== id),
        );

        writeShows(
          userId,
          readShows(userId).filter((show) => show.id !== id),
        );
        write(WATCHES_KEY, remainingWatches);
      },
    },

    watches: {
      async list(showId) {
        await wait();
        const { watches } = loadShow(showId);
        // Newest first. Reversing first puts the watch added later ahead on a shared day.
        return [...watches].reverse().sort((a, b) => b.finishedOn.localeCompare(a.finishedOn));
      },

      async add(showId, input) {
        await wait();
        const { userId, shows, show, allWatches, watches } = loadShow(showId);
        const next: Watch[] = [...watches, { id: crypto.randomUUID(), ...input }];
        return saveWatches(userId, shows, show, allWatches, next);
      },

      async remove(showId, watchId) {
        await wait();
        const { userId, shows, show, allWatches, watches } = loadShow(showId);

        if (!watches.some((watch) => watch.id === watchId)) {
          throw new ApiError(404, 'That watch no longer exists.');
        }
        if (watches.length === 1) {
          throw new ApiError(409, 'A series needs at least one watch.');
        }

        const next = watches.filter((watch) => watch.id !== watchId);
        return saveWatches(userId, shows, show, allWatches, next);
      },
    },
  };
}
