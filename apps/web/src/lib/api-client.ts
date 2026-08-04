import type { ApiErrorResponse } from '@digistream/contracts';
import { reconcileCreatorContext } from './backstage-context-runtime';
import {
  announceSessionExpired,
  announceSignedOut,
  installSessionCoordination,
  sessionLoginPath,
} from './session-coordination';

const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const apiBaseUrl = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/$/, '')
  : '';

const AUTH_API_PREFIX = '/api/v1/auth/';
const LOGOUT_API_PATH = '/api/v1/auth/logout';
const CREATOR_ROUTE_PREFIX = '/creator';
const SESSION_EXPIRED_EVENT = 'digistream:session-expired';
let sessionRecoveryStarted = false;

installSessionCoordination();

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

export function shouldRecoverExpiredSession(
  path: string,
  status: number,
  pathname: string,
): boolean {
  return (
    status === 401 &&
    pathname.startsWith(CREATOR_ROUTE_PREFIX) &&
    !path.startsWith(AUTH_API_PREFIX)
  );
}

function recoverExpiredSession(path: string, status: number): void {
  if (
    typeof window === 'undefined' ||
    !shouldRecoverExpiredSession(path, status, window.location.pathname) ||
    sessionRecoveryStarted
  ) {
    return;
  }

  sessionRecoveryStarted = true;
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.clear();
  announceSessionExpired(path);
  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { path, returnTo: currentPath },
    }),
  );
  window.location.replace(sessionLoginPath('session-expired', currentPath));
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
      "We couldn't reach the server. Check your connection and try again.",
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
      'The server returned a response this page could not read.',
      { contentType: response.headers.get('content-type') },
    );
  }

  if (path === LOGOUT_API_PATH && (options.method ?? 'GET').toUpperCase() === 'POST') {
    announceSignedOut();
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
