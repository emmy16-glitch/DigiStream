import type {
  ApiErrorResponse,
  Broadcast,
  BroadcastListResponse,
  BroadcastResponse,
} from '@digistream/contracts';
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
const BROADCAST_CREATE_PATH = /^\/api\/v1\/organisations\/[^/]+\/channels\/[^/]+\/broadcasts$/;
const BROADCAST_CREATE_PENDING_KEY = 'digistream:pending-broadcast-create';
const BROADCAST_CREATE_PENDING_TTL_MS = 30 * 60 * 1000;
let sessionRecoveryStarted = false;

const broadcastCreateRequests = new Map<string, Promise<unknown>>();

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

type PendingBroadcastCreate = {
  key: string;
  path: string;
  body: string;
  startedAt: number;
};

type BroadcastCreateInput = {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  scheduledStartAt?: unknown;
};

function requestMethod(options: RequestInit): string {
  return (options.method ?? 'GET').toUpperCase();
}

function requestBodyText(options: RequestInit): string | null {
  return typeof options.body === 'string' ? options.body : null;
}

function broadcastCreateKey(path: string, options: RequestInit): string | null {
  if (requestMethod(options) !== 'POST' || !BROADCAST_CREATE_PATH.test(path)) return null;
  const body = requestBodyText(options);
  return body ? `${path}\n${body}` : null;
}

function parseBroadcastCreateBody(body: string): BroadcastCreateInput | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    return typeof parsed === 'object' && parsed !== null
      ? parsed as BroadcastCreateInput
      : null;
  } catch {
    return null;
  }
}

function pendingBroadcastCreate(): PendingBroadcastCreate | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BROADCAST_CREATE_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingBroadcastCreate>;
    if (
      typeof parsed.key !== 'string' ||
      typeof parsed.path !== 'string' ||
      typeof parsed.body !== 'string' ||
      typeof parsed.startedAt !== 'number'
    ) {
      window.sessionStorage.removeItem(BROADCAST_CREATE_PENDING_KEY);
      return null;
    }
    if (Date.now() - parsed.startedAt > BROADCAST_CREATE_PENDING_TTL_MS) {
      window.sessionStorage.removeItem(BROADCAST_CREATE_PENDING_KEY);
      return null;
    }
    return parsed as PendingBroadcastCreate;
  } catch {
    return null;
  }
}

function rememberPendingBroadcastCreate(
  key: string,
  path: string,
  body: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      BROADCAST_CREATE_PENDING_KEY,
      JSON.stringify({ key, path, body, startedAt: Date.now() } satisfies PendingBroadcastCreate),
    );
  } catch {
    // Recovery metadata is best-effort. The server remains authoritative.
  }
}

function clearPendingBroadcastCreate(key?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (key) {
      const pending = pendingBroadcastCreate();
      if (pending && pending.key !== key) return;
    }
    window.sessionStorage.removeItem(BROADCAST_CREATE_PENDING_KEY);
  } catch {
    // Session storage failure must not block the request itself.
  }
}

function sameNullableString(actual: string | null, requested: unknown): boolean {
  if (requested === undefined || requested === null || requested === '') return actual === null;
  return typeof requested === 'string' && actual === requested;
}

function matchesPendingBroadcast(broadcast: Broadcast, bodyText: string): boolean {
  const requested = parseBroadcastCreateBody(bodyText);
  if (!requested) return false;
  if (
    typeof requested.slug !== 'string' ||
    typeof requested.title !== 'string' ||
    broadcast.slug !== requested.slug ||
    broadcast.title !== requested.title
  ) {
    return false;
  }
  if (!sameNullableString(broadcast.description, requested.description)) return false;
  if (requested.scheduledStartAt === undefined) return broadcast.scheduledStartAt === null;
  return typeof requested.scheduledStartAt === 'string' &&
    broadcast.scheduledStartAt === requested.scheduledStartAt;
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

async function performApiRequest<T>(
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

  if (path === LOGOUT_API_PATH && requestMethod(options) === 'POST') {
    announceSignedOut();
  }

  return reconcileCreatorContext(path, payload) as T;
}

async function reconcilePendingBroadcastCreate(
  path: string,
  body: string,
): Promise<BroadcastResponse | null> {
  const response = await performApiRequest<BroadcastListResponse>(path);
  const broadcast = response.broadcasts.find((item) => matchesPendingBroadcast(item, body));
  return broadcast ? { broadcast } : null;
}

function ambiguousBroadcastCreateFailure(error: unknown): boolean {
  return (
    (error instanceof ApiClientError && error.status === 0) ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

async function recoverableBroadcastCreate<T>(
  path: string,
  options: RequestInit,
  key: string,
  body: string,
): Promise<T> {
  const priorPending = pendingBroadcastCreate();
  const isRetry = priorPending?.key === key &&
    priorPending.path === path &&
    priorPending.body === body;

  if (isRetry) {
    const recovered = await reconcilePendingBroadcastCreate(path, body);
    if (recovered) {
      clearPendingBroadcastCreate(key);
      return recovered as T;
    }
  }

  rememberPendingBroadcastCreate(key, path, body);
  try {
    const result = await performApiRequest<T>(path, options);
    clearPendingBroadcastCreate(key);
    return result;
  } catch (error) {
    if (
      ambiguousBroadcastCreateFailure(error) ||
      (isRetry && error instanceof ApiClientError && error.code === 'BROADCAST_SLUG_TAKEN')
    ) {
      try {
        const recovered = await reconcilePendingBroadcastCreate(path, body);
        if (recovered) {
          clearPendingBroadcastCreate(key);
          return recovered as T;
        }
      } catch (recoveryError) {
        if (recoveryError instanceof ApiClientError && recoveryError.status === 401) {
          clearPendingBroadcastCreate(key);
          throw recoveryError;
        }
      }
    }

    if (error instanceof ApiClientError && error.status === 401) {
      clearPendingBroadcastCreate(key);
    } else if (!ambiguousBroadcastCreateFailure(error)) {
      clearPendingBroadcastCreate(key);
    }
    throw error;
  }
}

export function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const key = broadcastCreateKey(path, options);
  const body = requestBodyText(options);
  if (!key || !body) return performApiRequest<T>(path, options);

  const existing = broadcastCreateRequests.get(key);
  if (existing) return existing as Promise<T>;

  const request = recoverableBroadcastCreate<T>(path, options, key, body)
    .finally(() => {
      if (broadcastCreateRequests.get(key) === request) {
        broadcastCreateRequests.delete(key);
      }
    });
  broadcastCreateRequests.set(key, request);
  return request;
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
