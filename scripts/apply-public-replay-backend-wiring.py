from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise SystemExit(f"Expected text was not found in {path}: {old[:120]!r}")
    file.write_text(content.replace(old, new, 1))
    print(f"updated {path}")


replace_once(
    "apps/api/src/app.ts",
    "import { registerRecordingJobRoutes } from './modules/recordings/recording-jobs.routes.js';",
    "import { registerPublicReplayRoutes } from './modules/recordings/public-replays.routes.js';\n"
    "import { registerRecordingJobRoutes } from './modules/recordings/recording-jobs.routes.js';",
)

replace_once(
    "apps/api/src/app.ts",
    """  registerRecordingRoutes(app, database, mediaControlSecret, {
    objectStorage,
    accessManager: recordingAccessManager,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerRecordingJobRoutes""",
    """  registerRecordingRoutes(app, database, mediaControlSecret, {
    objectStorage,
    accessManager: recordingAccessManager,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerPublicReplayRoutes(app, database, {
    objectStorage,
    accessManager: recordingAccessManager,
  });
  registerRecordingJobRoutes""",
)

replace_once(
    "apps/api/src/app.ts",
    "stage: 'recording-retention',",
    "stage: 'public-replay-listening',",
)

replace_once(
    "apps/api/src/app.ts",
    """      'recording-http-range-delivery',
      'independent-playback-download-authorization',""",
    """      'recording-http-range-delivery',
      'independent-playback-download-authorization',
      'public-replay-discovery',
      'public-and-unlisted-replay-listening',
      'private-member-replay-metadata',""",
)

replace_once(
    "apps/api/test/health.test.ts",
    "assert.equal(response.json().stage, 'recording-retention');",
    "assert.equal(response.json().stage, 'public-replay-listening');",
)

replace_once(
    "apps/api/test/health.test.ts",
    """  assert.ok(
    response.json().capabilities.includes('recording-cleanup-reconciliation'),
  );""",
    """  assert.ok(
    response.json().capabilities.includes('recording-cleanup-reconciliation'),
  );
  assert.ok(response.json().capabilities.includes('public-replay-discovery'));
  assert.ok(
    response.json().capabilities.includes('public-and-unlisted-replay-listening'),
  );""",
)

replace_once(
    "packages/contracts/src/index.ts",
    """    | 'realtime-auth-foundation'
    | 'durable-live-chat';""",
    """    | 'realtime-auth-foundation'
    | 'durable-live-chat'
    | 'recording-retention'
    | 'public-replay-listening';""",
)

replay_types = """
export type ReplayAccess = 'public' | 'unlisted' | 'member';

export type PublicReplay = {
  id: string;
  recordingId: string;
  organisationId: string;
  channelId: string;
  broadcastId: string;
  title: string;
  slug: string;
  description: string | null;
  endedAt: string | null;
  publishedAt: string | null;
  media: {
    format: string;
    contentType: string;
    sizeBytes: number;
    durationMs: number;
  };
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    visibility: ChannelVisibility;
  };
  access: ReplayAccess;
  updatedAt: string;
};

export type PublicReplayResponse = {
  replay: PublicReplay;
};

export type PublicReplayListResponse = {
  replays: PublicReplay[];
};

export type RecordingPlaybackAccessResponse = {
  access: {
    mode: 'playback';
    url: string;
    expiresAt: string;
  };
};
"""

replace_once(
    "packages/contracts/src/index.ts",
    """export type PublicBroadcastListResponse = {
  broadcasts: PublicBroadcast[];
};

export type BroadcastPlaybackSource""",
    """export type PublicBroadcastListResponse = {
  broadcasts: PublicBroadcast[];
};

""" + replay_types.strip() + "\n\nexport type BroadcastPlaybackSource",
)

replace_once(
    "apps/web/src/features/listening/listener-route.ts",
    """export type ListenerRoute =
  | { kind: 'discovery' }
  | {""",
    """export type ListenerRoute =
  | { kind: 'discovery' }
  | { kind: 'replay-discovery' }
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
  | {""",
)

replace_once(
    "apps/web/src/features/listening/listener-route.ts",
    """  if (parts.length === 1) return { kind: 'discovery' };

  if (parts[1] === 'member' && parts.length === 4) {""",
    """  if (parts.length === 1) return { kind: 'discovery' };
  if (parts[1] === 'replays' && parts.length === 2) {
    return { kind: 'replay-discovery' };
  }

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

  if (parts[1] === 'member' && parts.length === 4) {""",
)

replace_once(
    "apps/web/src/features/listening/listener-route.ts",
    """export function publicListenerPath(input: {
  organisationSlug: string;
  channelSlug: string;
  broadcastSlug: string;
}): string {
  return `/listen/${encodeURIComponent(input.organisationSlug)}/${encodeURIComponent(
    input.channelSlug,
  )}/${encodeURIComponent(input.broadcastSlug)}`;
}
""",
    """export function publicListenerPath(input: {
  organisationSlug: string;
  channelSlug: string;
  broadcastSlug: string;
}): string {
  return `/listen/${encodeURIComponent(input.organisationSlug)}/${encodeURIComponent(
    input.channelSlug,
  )}/${encodeURIComponent(input.broadcastSlug)}`;
}

export function publicReplayPath(input: {
  organisationSlug: string;
  channelSlug: string;
  broadcastSlug: string;
}): string {
  return `/listen/replay/${encodeURIComponent(input.organisationSlug)}/${encodeURIComponent(
    input.channelSlug,
  )}/${encodeURIComponent(input.broadcastSlug)}`;
}

export function memberReplayPath(input: {
  organisationId: string;
  recordingId: string;
}): string {
  return `/listen/member-replay/${encodeURIComponent(input.organisationId)}/${encodeURIComponent(
    input.recordingId,
  )}`;
}
""",
)

replace_once(
    "apps/web/src/design-system/shells.tsx",
    "current: 'discover' | 'live';",
    "current: 'discover' | 'live' | 'replay';",
)

replace_once(
    "apps/web/src/design-system/shells.tsx",
    """  const nestedBroadcastRoute =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/listen/');
  const resolvedCurrent = nestedBroadcastRoute ? null : current;""",
    """  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/listen';
  const replayRoute =
    pathname === '/listen/replays' ||
    pathname.startsWith('/listen/replay/') ||
    pathname.startsWith('/listen/member-replay/');
  const nestedBroadcastRoute =
    pathname.startsWith('/listen/') && !replayRoute;
  const resolvedCurrent = replayRoute ? 'replay' : nestedBroadcastRoute ? null : current;""",
)

replace_once(
    "apps/web/src/design-system/shells.tsx",
    """          <a aria-current={resolvedCurrent === 'live' ? 'page' : undefined} href="/listen?status=live">
            Live now
          </a>""",
    """          <a aria-current={resolvedCurrent === 'live' ? 'page' : undefined} href="/listen?status=live">
            Live now
          </a>
          <a aria-current={resolvedCurrent === 'replay' ? 'page' : undefined} href="/listen/replays">
            Replays
          </a>""",
)

replace_once(
    "apps/web/src/App.tsx",
    "import { ListenerDiscoveryPage } from './features/listening/ListenerDiscoveryPage';",
    "import { ListenerDiscoveryPage } from './features/listening/ListenerDiscoveryPage';\n"
    "import { ReplayDiscoveryPage } from './features/listening/ReplayDiscoveryPage';\n"
    "import { ReplayListeningPage } from './features/listening/ReplayListeningPage';",
)

replace_once(
    "apps/web/src/App.tsx",
    """  if (listenerRoute?.kind === 'public-broadcast') {
    return (""",
    """  if (listenerRoute?.kind === 'replay-discovery') {
    return (
      <ListenerShell current="replay">
        <ReplayDiscoveryPage />
      </ListenerShell>
    );
  }
  if (
    listenerRoute?.kind === 'public-replay' ||
    listenerRoute?.kind === 'member-replay'
  ) {
    return (
      <ListenerShell
        current="replay"
        footer="Replay access is short-lived and private. DigiStream rechecks recording visibility and retention state before playback."
      >
        <ReplayListeningPage route={listenerRoute} />
      </ListenerShell>
    );
  }
  if (listenerRoute?.kind === 'public-broadcast') {
    return (""",
)

print("public replay API, contracts and web routing applied")
