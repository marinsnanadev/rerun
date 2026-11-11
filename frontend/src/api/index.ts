import { createHttpClient } from './http-client';
import { createMockClient } from './mock-client';
import type { ApiClient } from './types';

export const api: ApiClient =
  import.meta.env.VITE_API_MOCK === 'true' ? createMockClient() : createHttpClient();

export { ApiError, errorMessage } from './errors';
export type { ApiClient, Credentials, ShowPatch, User } from './types';
