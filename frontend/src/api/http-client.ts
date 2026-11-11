import { ApiError } from './errors';
import type { ApiClient } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  json?: unknown;
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || 'The request failed.';

  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const { detail } = body;
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = 'Some of the information sent was not valid.';
      }
    }
  } catch {
    // The body was empty or not JSON. Keep the status text.
  }

  return new ApiError(response.status, message);
}

async function request<T>(path: string, { method = 'GET', json }: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      // The session lives in an HTTP-only cookie set by the backend.
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(json !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: json === undefined ? null : JSON.stringify(json),
    });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function createHttpClient(): ApiClient {
  return {
    auth: {
      register: (credentials) => request('/auth/register', { method: 'POST', json: credentials }),
      login: (credentials) => request('/auth/login', { method: 'POST', json: credentials }),
      logout: () => request('/auth/logout', { method: 'POST' }),
      me: () => request('/auth/me'),
    },
    shows: {
      list: () => request('/shows'),
      create: (input) => request('/shows', { method: 'POST', json: input }),
      update: (id, patch) =>
        request(`/shows/${encodeURIComponent(id)}`, { method: 'PATCH', json: patch }),
      remove: (id) => request(`/shows/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    },
  };
}
