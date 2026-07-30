export type ListenerRoute =
  | { kind: 'discovery' }
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

function decodeSegment(segment: string): string | null {
  try {
    const value = decodeURIComponent(segment).trim();
    return value || null;
  } catch {
    return null;
  }
}

export function parseListenerRoute(pathname: string): ListenerRoute | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'listen') return null;
  if (parts.length === 1) return { kind: 'discovery' };

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
  return `/listen/${encodeURIComponent(input.organisationSlug)}/${encodeURIComponent(
    input.channelSlug,
  )}/${encodeURIComponent(input.broadcastSlug)}`;
}
