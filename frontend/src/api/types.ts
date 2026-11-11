import type { Show, ShowInput } from '../domain/show';

export interface User {
  id: string;
  username: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export type ShowPatch = Partial<ShowInput>;

/**
 * The contract between the UI and a backend. The real implementation talks to
 * the REST API; the mock implementation keeps everything in the browser.
 *
 * Wire format: JSON with camelCase keys and `YYYY-MM-DD` dates.
 */
export interface ApiClient {
  auth: {
    register(credentials: Credentials): Promise<User>;
    login(credentials: Credentials): Promise<User>;
    logout(): Promise<void>;
    me(): Promise<User>;
  };
  shows: {
    list(): Promise<Show[]>;
    create(input: ShowInput): Promise<Show>;
    update(id: string, patch: ShowPatch): Promise<Show>;
    remove(id: string): Promise<void>;
  };
}
