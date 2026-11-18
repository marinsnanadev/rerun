import { createHttpClient } from './http-client';
import { createMockClient } from './mock-client';
import { withSessionExpiry } from './session';
import type { ApiClient } from './types';

export const api: ApiClient = withSessionExpiry(
  import.meta.env.VITE_API_MOCK === 'true' ? createMockClient() : createHttpClient(),
);

export { ApiError, errorMessage } from './errors';
export { onSessionExpired } from './session';
export type { ApiClient, Credentials, ShowPatch, User } from './types';
