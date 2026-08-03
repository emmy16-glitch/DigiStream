import type { ApiErrorResponse } from '@digistream/contracts';
import { reconcileCreatorContext } from './backstage-context-runtime';

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const apiBaseUrl = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/$/, '')
  : '';

const AUTH_API_PREFIX = '/api/v1/auth/';
const SESSION_EXPIRED_EVENT = 'digistream:session-expired';
let sessionRecoveryStarted = false;

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function shouldRecoverExpiredSession(path: string, status: number): boolean {
  return status === 401 && !path.startsWith(AUTH_API_PREFIX);
}

function recoverExpiredSession(path: string, status: number): void {
  if (
    !shouldRecoverExpiredSession(path, status) ||
    sessionRecoveryStarted ||
    typeof window === 'undefined'
  ) {
    return;
  }

  sessionRecoveryStarted = true;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { path, returnTo: currentPath },
    }),
  );

  if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
    return;
  }

  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('reason', 'session-expired');
  loginUrl.searchParams.set('returnTo', currentPath);
  window.location.assign(loginUrl.toString());
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
  let parsedJson = true;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      parsedJson = false;
      payload = text;
    }
  }

  if (!response.ok) {
    recoverExpiredSession(path, response.status);
    const apiError = payload as ApiErrorResponse | null;
    if (apiError?.error) {
      throw new ApiClientError(
        response.status,
        apiError.error.code,
        apiError.error.message,
        apiError.error.details,
        apiError.error.requestId,
      );
    }
    throw new ApiClientError(
      response.status,
      'REQUEST_FAILED',
      typeof payload === 'string' ? payload : 'The request could not be completed.',
    );
  }

  if (text && !parsedJson) {
    throw new ApiClientError(
      response.status,
      'INVALID_API_RESPONSE',
      'DigiStream received an invalid response from the application server.',
      { contentType: response.headers.get('content-type') },
    );
  }

  return reconcileCreatorContext(path, payload) as T;
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
