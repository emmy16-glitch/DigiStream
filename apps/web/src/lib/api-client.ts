import type { ApiErrorResponse } from '@digistream/contracts';

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const apiBaseUrl = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/$/, '')
  : '';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiClientError(
      0,
      'API_UNREACHABLE',
      'DigiStream could not connect to the application server.',
      error,
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const apiError = payload as ApiErrorResponse | null;
    if (apiError?.error) {
      throw new ApiClientError(
        response.status,
        apiError.error.code,
        apiError.error.message,
        apiError.error.details,
      );
    }
    throw new ApiClientError(
      response.status,
      'REQUEST_FAILED',
      typeof payload === 'string' ? payload : 'The request could not be completed.',
    );
  }

  return payload as T;
}

export function realtimeEndpoint(path = '/api/v1/realtime'): string {
  const base = new URL(apiBaseUrl || window.location.origin, window.location.origin);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = path;
  base.search = '';
  base.hash = '';
  return base.toString();
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
