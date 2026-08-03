import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Broadcast,
  BroadcastListResponse,
  Channel,
  ChannelListResponse,
  Organisation,
} from '@digistream/contracts';
import {
  Button,
  LinkButton,
  StatePanel,
  StatusBadge,
  type StatusTone,
} from '../../design-system/components';
import { memberReplayPath, publicReplayPath } from '../listening/listener-route';
import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import './creator-recordings-page.css';

type RecordingStatus =
  | 'recording'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'published'
  | 'private'
  | 'archived'
  | 'deleted';

type Recording = {
  id: string;
  organisationId: string;
  channelId: string;
  broadcastId: string;
  status: RecordingStatus;
  mediaFormat: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  durationMs: number | null;
  checksumSha256: string | null;
  processingError: string | null;
  retryCount: number;
  readyAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  broadcast: {
    title: string;
    slug: string;
    status: string;
    endedAt: string | null;
  };
  channel: {
    name: string;
    slug: string;
  };
  artifactReady: boolean;
  replayAvailable: boolean;
  downloadAvailable: boolean;
};

type RecordingListResponse = { recordings: Recording[] };
type RecordingResponse = { recording: Recording };
type RecordingRequestResponse = RecordingResponse & { replayed: boolean };

type CompletedBroadcastSource = {
  broadcast: Broadcast;
  channel: Channel;
};

type CreatorRecordingsPageProps = {
  organisation: Organisation;
};

type ReplayDestination = {
  href: string;
  label: string;
};

type WorkspaceLoadOptions = {
  background?: boolean;
};

const PROCESSING_RECORDING_STATUSES: ReadonlySet<RecordingStatus> = new Set([
  'recording',
  'uploading',
  'processing',
]);
const RECORDING_REFRESH_INTERVAL_MS = 15_000;

function readableError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'DigiStream could not complete that recording action.';
}

function sentenceCase(value: string): string {
  return value.replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase());
}

function statusTone(status: RecordingStatus): StatusTone {
  if (status === 'published' || status === 'ready') return 'success';
  if (PROCESSING_RECORDING_STATUSES.has(status)) return 'info';
  if (status === 'failed' || status === 'deleted') return 'danger';
  if (status === 'archived') return 'warning';
  return 'neutral';
}

function formatDate(value: string | null): string {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(value: number | null): string {
  if (value === null) return 'Pending';
  const totalSeconds = Math.round(value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .filter((part, index) => part > 0 || index > 0)
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

function formatSize(value: number | null): string {
  if (value === null) return 'Pending';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function availableActions(status: RecordingStatus): Array<{
  label: string;
  status: 'published' | 'private' | 'archived';
  primary?: boolean;
}> {
  if (status === 'ready') {
    return [
      { label: 'Publish replay', status: 'published', primary: true },
      { label: 'Keep private', status: 'private' },
      { label: 'Archive', status: 'archived' },
    ];
  }
  if (status === 'published') {
    return [
      { label: 'Make private', status: 'private' },
      { label: 'Archive', status: 'archived' },
    ];
  }
  if (status === 'private') {
    return [
      { label: 'Publish replay', status: 'published', primary: true },
      { label: 'Archive', status: 'archived' },
    ];
  }
  if (status === 'archived') {
    return [{ label: 'Restore privately', status: 'private' }];
  }
  return [];
}

function replayGuidance(
  recording: Recording,
  channelVisibility: Channel['visibility'] | undefined,
): string {
  if (recording.status === 'published') {
    if (channelVisibility === 'private' || channelVisibility === undefined) {
      return 'This channel is private, so organisation members use the protected member replay page.';
    }
    if (channelVisibility === 'unlisted') {
      return 'Open the exact unlisted listener link. It is not exposed in public discovery.';
    }
    return 'Open the public listener page to verify the published replay experience.';
  }
  if (recording.status === 'private') {
    return 'Organisation members can open the protected member replay page.';
  }
  if (recording.status === 'archived') {
    return 'Playback is revoked while this recording remains archived.';
  }
  if (recording.artifactReady) {
    return 'Choose published or private visibility before listener playback becomes available.';
  }
  return 'Playback becomes available only after the recording worker verifies the artifact.';
}

function replayDestination(
  recording: Recording,
  organisation: Organisation,
  channel: Channel | undefined,
): ReplayDestination | null {
  if (recording.status !== 'published' && recording.status !== 'private') {
    return null;
  }

  if (
    recording.status === 'private' ||
    channel?.visibility === 'private' ||
    channel === undefined
  ) {
    return {
      href: memberReplayPath({
        organisationId: organisation.id,
        recordingId: recording.id,
      }),
      label: 'Open member replay',
    };
  }

  return {
    href: publicReplayPath({
      organisationSlug: organisation.slug,
      channelSlug: recording.channel.slug,
      broadcastSlug: recording.broadcast.slug,
    }),
    label:
      channel.visibility === 'unlisted'
        ? 'Open unlisted replay'
        : 'Open listener replay',
  };
}

export function CreatorRecordingsPage({
  organisation,
}: CreatorRecordingsPageProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [completedSources, setCompletedSources] = useState<CompletedBroadcastSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [requestingBroadcastId, setRequestingBroadcastId] = useState<string | null>(null);
  const loadSequenceRef = useRef(0);

  const canManage =
    organisation.role === 'owner' ||
    organisation.role === 'admin' ||
    organisation.role === 'broadcaster';

  const loadWorkspace = useCallback(async (
    options: WorkspaceLoadOptions = {},
  ) => {
    const sequence = loadSequenceRef.current + 1;
    loadSequenceRef.current = sequence;
    const background = options.background === true;

    if (!background) {
      setLoading(true);
      setError('');
    }

    try {
      const [recordingResponse, channelResponse] = await Promise.all([
        apiRequest<RecordingListResponse>(
          `/api/v1/organisations/${organisation.id}/recordings`,
        ),
        apiRequest<ChannelListResponse>(
          `/api/v1/organisations/${organisation.id}/channels`,
        ),
      ]);

      const channelBroadcasts = await Promise.all(
        channelResponse.channels.map(async (channel) => {
          const response = await apiRequest<BroadcastListResponse>(
            `/api/v1/organisations/${organisation.id}/channels/${channel.id}/broadcasts`,
          );
          return response.broadcasts
            .filter((broadcast) => broadcast.status === 'completed')
            .map((broadcast) => ({ broadcast, channel }));
        }),
      );

      if (sequence !== loadSequenceRef.current) return;

      setRecordings(recordingResponse.recordings);
      setChannels(channelResponse.channels);
      setCompletedSources(
        channelBroadcasts
          .flat()
          .sort((left, right) => {
            const leftDate = left.broadcast.endedAt ?? left.broadcast.updatedAt;
            const rightDate = right.broadcast.endedAt ?? right.broadcast.updatedAt;
            return new Date(rightDate).getTime() - new Date(leftDate).getTime();
          }),
      );
      setError('');
    } catch (requestError) {
      if (sequence !== loadSequenceRef.current) return;
      if (!background) setError(readableError(requestError));
    } finally {
      if (!background && sequence === loadSequenceRef.current) setLoading(false);
    }
  }, [organisation.id]);

  useEffect(() => {
    void loadWorkspace();
    return () => {
      loadSequenceRef.current += 1;
    };
  }, [loadWorkspace]);

  const hasProcessingRecordings = recordings.some((recording) =>
    PROCESSING_RECORDING_STATUSES.has(recording.status));

  useEffect(() => {
    if (!hasProcessingRecordings) return undefined;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadWorkspace({ background: true });
      }
    };
    const intervalId = window.setInterval(
      refreshWhenVisible,
      RECORDING_REFRESH_INTERVAL_MS,
    );
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [hasProcessingRecordings, loadWorkspace]);

  const counts = useMemo(() => ({
    total: recordings.length,
    processing: recordings.filter((recording) =>
      PROCESSING_RECORDING_STATUSES.has(recording.status)).length,
    ready: recordings.filter((recording) => recording.artifactReady).length,
    published: recordings.filter((recording) => recording.status === 'published').length,
  }), [recordings]);

  const channelById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  );

  const eligibleSources = useMemo(() => {
    const recordedBroadcastIds = new Set(recordings.map((recording) => recording.broadcastId));
    return completedSources.filter(
      (source) => !recordedBroadcastIds.has(source.broadcast.id),
    );
  }, [completedSources, recordings]);

  async function requestRecording(source: CompletedBroadcastSource) {
    setRequestingBroadcastId(source.broadcast.id);
    setError('');
    try {
      const response = await apiRequest<RecordingRequestResponse>(
        `/api/v1/organisations/${organisation.id}/broadcasts/${source.broadcast.id}/recording`,
        { method: 'POST' },
      );
      setRecordings((current) => {
        const existing = current.some((item) => item.id === response.recording.id);
        return existing
          ? current.map((item) =>
            item.id === response.recording.id ? response.recording : item)
          : [response.recording, ...current];
      });
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setRequestingBroadcastId(null);
    }
  }

  async function changeStatus(
    recording: Recording,
    status: 'published' | 'private' | 'archived',
  ) {
    setUpdatingId(recording.id);
    setError('');
    try {
      const response = await apiRequest<RecordingResponse>(
        `/api/v1/organisations/${organisation.id}/recordings/${recording.id}`,
        {
          method: 'PATCH',
          body: jsonBody({ status }),
        },
      );
      setRecordings((current) => current.map((item) =>
        item.id === response.recording.id ? response.recording : item));
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="creator-recordings-page">
      <header className="workspace-page-intro recording-page-intro">
        <div>
          <h2>Recordings and replay</h2>
          <p>
            Track real capture, upload and processing states. Private storage keys remain server-only.
          </p>
        </div>
        <Button onClick={() => void loadWorkspace()}>Refresh</Button>
      </header>

      <section className="recording-summary-grid" aria-label="Recording summary">
        <article><span>Total jobs</span><strong>{counts.total}</strong></article>
        <article><span>Processing</span><strong>{counts.processing}</strong></article>
        <article><span>Artifacts ready</span><strong>{counts.ready}</strong></article>
        <article><span>Published</span><strong>{counts.published}</strong></article>
      </section>

      {error ? (
        <StatePanel
          actionLabel="Retry"
          kind="error"
          onAction={() => void loadWorkspace()}
          title="Recording action could not be completed"
        >
          {error}
        </StatePanel>
      ) : null}

      {loading ? (
        <StatePanel kind="loading" title="Loading recording workspace">
          DigiStream is loading completed broadcasts and recording jobs for {organisation.name}.
        </StatePanel>
      ) : (
        <>
          <section className="recording-candidates" aria-labelledby="recording-candidates-title">
            <header>
              <div>
                <span>Completed broadcasts</span>
                <h3 id="recording-candidates-title">Prepare a replay</h3>
              </div>
              <StatusBadge tone={eligibleSources.length > 0 ? 'info' : 'neutral'}>
                {eligibleSources.length} eligible
              </StatusBadge>
            </header>

            {eligibleSources.length === 0 ? (
              <StatePanel kind="empty" title="No completed broadcast needs a recording job">
                Finish a real broadcast first. Existing recording jobs are listed below and duplicate requests are prevented by the API.
              </StatePanel>
            ) : (
              <div className="recording-candidate-list">
                {eligibleSources.map((source) => (
                  <article key={source.broadcast.id}>
                    <div>
                      <span className="recording-eyebrow">{source.channel.name}</span>
                      <h4>{source.broadcast.title}</h4>
                      <p>Completed {formatDate(source.broadcast.endedAt)}.</p>
                    </div>
                    {canManage ? (
                      <Button
                        loading={requestingBroadcastId === source.broadcast.id}
                        onClick={() => void requestRecording(source)}
                        variant="primary"
                      >
                        Prepare recording
                      </Button>
                    ) : (
                      <span className="recording-permission-note">
                        Owner, administrator or broadcaster permission is required.
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {recordings.length === 0 ? (
            <StatePanel kind="empty" title="No recording jobs yet">
              Completed broadcasts can create a recording job. DigiStream will show only real capture and processing data here.
            </StatePanel>
          ) : (
            <section className="recording-list" aria-label="Organisation recordings">
              {recordings.map((recording) => {
                const channel = channelById.get(recording.channelId);
                const destination = replayDestination(
                  recording,
                  organisation,
                  channel,
                );

                return (
                  <article className="recording-card" key={recording.id}>
                    <div className="recording-card-heading">
                      <div>
                        <StatusBadge tone={statusTone(recording.status)}>
                          {sentenceCase(recording.status)}
                        </StatusBadge>
                        {recording.artifactReady ? (
                          <StatusBadge tone="success">Artifact verified</StatusBadge>
                        ) : null}
                      </div>
                      <span>Updated {formatDate(recording.updatedAt)}</span>
                    </div>

                    <div className="recording-card-body">
                      <div>
                        <span className="recording-eyebrow">{recording.channel.name}</span>
                        <h3>{recording.broadcast.title}</h3>
                        <p>
                          Broadcast completed {formatDate(recording.broadcast.endedAt)}.
                        </p>
                      </div>
                      <dl>
                        <div><dt>Duration</dt><dd>{formatDuration(recording.durationMs)}</dd></div>
                        <div><dt>File size</dt><dd>{formatSize(recording.sizeBytes)}</dd></div>
                        <div><dt>Format</dt><dd>{recording.mediaFormat?.toUpperCase() ?? 'Pending'}</dd></div>
                        <div><dt>Retries</dt><dd>{recording.retryCount}</dd></div>
                      </dl>
                    </div>

                    {recording.processingError ? (
                      <div className="recording-error" role="alert">
                        <strong>Processing failed</strong>
                        <span>{recording.processingError}</span>
                      </div>
                    ) : null}

                    <footer className="recording-card-footer">
                      <div>
                        {recording.status === 'published' ? (
                          <strong>Replay policy is published.</strong>
                        ) : recording.status === 'private' ? (
                          <strong>Replay access is limited to organisation members.</strong>
                        ) : recording.artifactReady ? (
                          <strong>The artifact is ready for a visibility decision.</strong>
                        ) : (
                          <strong>Waiting for the recording worker.</strong>
                        )}
                        <span>
                          {replayGuidance(recording, channel?.visibility)}
                        </span>
                      </div>
                      <div className="recording-actions">
                        {destination ? (
                          <LinkButton
                            href={destination.href}
                            icon="headphones"
                            variant="primary"
                          >
                            {destination.label}
                          </LinkButton>
                        ) : null}
                        {availableActions(recording.status).map((action) => (
                          <Button
                            key={action.status}
                            loading={updatingId === recording.id}
                            onClick={() => void changeStatus(recording, action.status)}
                            variant={action.primary ? 'primary' : 'secondary'}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </footer>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
