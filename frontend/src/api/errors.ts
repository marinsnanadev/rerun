export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** A message that is safe to show to the person using the app. */
export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  return error instanceof ApiError ? error.message : fallback;
}
