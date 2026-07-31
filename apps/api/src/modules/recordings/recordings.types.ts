export type RecordingStatus =
  | 'recording'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'published'
  | 'private'
  | 'archived'
  | 'deleted';

export type RecordingDto = {
  id: string;
  organisationId: string;
  channelId: string;
  broadcastId: string;
  requestedByUserId: string | null;
  status: RecordingStatus;
  mediaFormat: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
  checksumSha256: string | null;
  processingError: string | null;
  retryCount: number;
  capturedAt: Date | null;
  uploadStartedAt: Date | null;
  processingStartedAt: Date | null;
  readyAt: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  broadcast: {
    title: string;
    slug: string;
    status: string;
    endedAt: Date | null;
  };
  channel: {
    name: string;
    slug: string;
  };
  artifactReady: boolean;
  replayAvailable: boolean;
  downloadAvailable: boolean;
};

export type RecordingWorkerPatch = {
  status: Extract<
    RecordingStatus,
    'recording' | 'uploading' | 'processing' | 'ready' | 'failed'
  >;
  provider?: string;
  providerArtifactId?: string | null;
  mediaFormat?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  durationMs?: number | null;
  checksumSha256?: string | null;
  processingError?: string | null;
};

export type RecordingManagementPatch = {
  status: Extract<RecordingStatus, 'published' | 'private' | 'archived'>;
};
