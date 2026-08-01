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

print("public replay backend wiring applied")
