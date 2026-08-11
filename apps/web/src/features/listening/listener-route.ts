export type ListenerRoute =
  | { kind: 'discovery' }
  | { kind: 'replay-discovery' }
  | { kind: 'library' }
  | {
      kind: 'public-replay';
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    }
  | {
      kind: 'member-replay';
      organisationId: string;
      recordingId: string;
    }
  | {
      kind: 'public-broadcast';
      organisationSlug: string;
      channelSlug: string;
      broadcastSlug: string;
    }
  | {
      kind: 'member-broadcast';
      organisationId: string;
      broadcastId: string;
    };

const MAX_ROUTE_SEGMENT_CODE_POINTS = 128;
const UNSAFE_ROUTE_SEGMENT = /[\u0000-\u001f\u007f/\\?#%]|\p{Cf}/u;

function normalizeSegment(value: string): string | null {
  const normalized = value.trim().normalize('NFC');
  if (
    !normalized ||
    normalized === '.' ||
    normalized === '..' ||
    Array.from(normalized).length > MAX_ROUTE_SEGMENT_CODE_POINTS ||
    UNSAFE_ROUTE_SEGMENT.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function decodeSegment(segment: string): string | null {
  try {
    return normalizeSegment(decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function encodeSegment(value: string): string {
  const normalized = normalizeSegment(value);
  if (!normalized) {
    throw new TypeError(
      'Listener route segments must be short, visible, non-empty path-safe values.',
    );
  }
  return encodeURIComponent(normalized);
}

function canonicalPathParts(pathname: string): string[] | null {
  if (!pathname.startsWith('/') || pathname === '/' || pathname.endsWith('/')) {
    return null;
  }

  const parts = pathname.slice(1).split('/');
  if (parts.some((part) => part.length === 0)) return null;
  return parts;
}

export function parseListenerRoute(pathname: string): ListenerRoute | null {
  const parts = canonicalPathParts(pathname);
  if (!parts || parts[0] !== 'listen') return null;
  if (parts.length === 1) return { kind: 'discovery' };
  if (parts[1] === 'replays' && parts.length === 2) {
    return { kind: 'replay-discovery' };
  }
  if (parts[1] === 'library' && parts.length === 2) return { kind: 'library' };

  if (parts[1] === 'replay' && parts.length === 5) {
    const organisationSlug = decodeSegment(parts[2] ?? '');
    const channelSlug = decodeSegment(parts[3] ?? '');
    const broadcastSlug = decodeSegment(parts[4] ?? '');
    return organisationSlug && channelSlug && broadcastSlug
      ? {
          kind: 'public-replay',
          organisationSlug,
          channelSlug,
          broadcastSlug,
        }
      : null;
  }

  if (parts[1] === 'member-replay' && parts.length === 4) {
    const organisationId = decodeSegment(parts[2] ?? '');
    const recordingId = decodeSegment(parts[3] ?? '');
    return organisationId && recordingId
      ? { kind: 'member-replay', organisationId, recordingId }
      : null;
  }

  if (parts[1] === 'member' && parts.length === 4) {
    const organisationId = decodeSegment(parts[2] ?? '');
    const broadcastId = decodeSegment(parts[3] ?? '');
    return organisationId && broadcastId
      ? { kind: 'member-broadcast', organisationId, broadcastId }
      : null;
  }

  if (parts.length === 4) {
    const organisationSlug = decodeSegment(parts[1] ?? '');
    const channelSlug = decodeSegment(parts[2] ?? '');
    const broadcastSlug = decodeSegment(parts[3] ?? '');
    return organisationSlug && channelSlug && broadcastSlug
      ? {
          kind: 'public-broadcast',
          organisationSlug,
          channelSlug,
          broadcastSlug,
        }
      : null;
  }

  return null;
}

export function publicListenerPath(input: {
  organisationSlug: string;
  channelSlug: string;
  broadcastSlug: string;
}): string {
  return `/listen/${encodeSegment(input.organisationSlug)}/${encodeSegment(
    input.channelSlug,
  )}/${encodeSegment(input.broadcastSlug)}`;
}

export function publicReplayPath(input: {
  organisationSlug: string;
  channelSlug: string;
  broadcastSlug: string;
}): string {
  return `/listen/replay/${encodeSegment(input.organisationSlug)}/${encodeSegment(
    input.channelSlug,
  )}/${encodeSegment(input.broadcastSlug)}`;
}

export function memberReplayPath(input: {
  organisationId: string;
  recordingId: string;
}): string {
  return `/listen/member-replay/${encodeSegment(input.organisationId)}/${encodeSegment(
    input.recordingId,
  )}`;
}
