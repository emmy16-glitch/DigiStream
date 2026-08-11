import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Broadcast,
  BroadcastListResponse,
  Channel,
  ChannelListResponse,
  Organisation,
} from '@digistream/contracts';
import { Button, LinkButton, StatePanel } from '../../design-system/components';
import { FilterTabs, SearchField } from '../../design-system/primitives';
import { Icon } from '../../design-system/Icon';
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

type RecordingFilter = 'all' | 'replay' | 'processing' | 'private';

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

function statusPresentation(status: RecordingStatus): {
  label: string;
  tone: 'success' | 'processing' | 'danger' | 'neutral';
} {
  if (status === 'ready') return { label: 'Ready', tone: 'success' };
  if (status === 'published') return { label: 'Published', tone: 'success' };
  if (status === 'private') return { label: 'Private', tone: 'success' };
  if (PROCESSING_RECORDING_STATUSES.has(status)) {
    return { label: 'Processing', tone: 'processing' };
  }
  if (status === 'failed' || status === 'deleted') {
    return { label: status === 'failed' ? 'Failed' : 'Deleted', tone: 'danger' };
  }
  return { label: 'Archived', tone: 'neutral' };
}

function formatDate(value: string | null): string {
  if (!value) return 'Date pending';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
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
      label: 'Play',
    };
  }

  return {
    href: publicReplayPath({
      organisationSlug: organisation.slug,
      channelSlug: recording.channel.slug,
      broadcastSlug: recording.broadcast.slug,
    }),
    label: 'Play',
  };
}

function recordingDate(recording: Recording): string | null {
  return recording.broadcast.endedAt ?? recording.readyAt ?? recording.createdAt;
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
  const [recordingFilter, setRecordingFilter] = useState<RecordingFilter>('all');
  const [recordingQuery, setRecordingQuery] = useState('');
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

  const filteredRecordings = useMemo(() => {
    const query = recordingQuery.trim().toLocaleLowerCase();
    return recordings.filter((recording) => {
      const matchesQuery = query.length === 0 || [
        recording.broadcast.title,
        recording.channel.name,
        recording.broadcast.slug,
      ].some((value) => value.toLocaleLowerCase().includes(query));
      if (!matchesQuery) return false;
      if (recordingFilter === 'replay') return recording.replayAvailable;
      if (recordingFilter === 'processing') return PROCESSING_RECORDING_STATUSES.has(recording.status);
      if (recordingFilter === 'private') return recording.status === 'private' || recording.status === 'archived';
      return true;
    });
  }, [recordingFilter, recordingQuery, recordings]);

  const recordingTabs = useMemo(() => [
    { label: 'All', value: 'all', count: recordings.length },
    { label: 'Replay available', value: 'replay', count: recordings.filter((recording) => recording.replayAvailable).length },
    { label: 'Processing', value: 'processing', count: recordings.filter((recording) => PROCESSING_RECORDING_STATUSES.has(recording.status)).length },
    { label: 'Private', value: 'private', count: recordings.filter((recording) => recording.status === 'private' || recording.status === 'archived').length },
  ], [recordings]);

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
      <header className="recordings-reference-header">
        <div>
          <p>Your completed broadcasts.</p>
        </div>
        <Button onClick={() => void loadWorkspace()} variant="ghost">
          Refresh
        </Button>
      </header>

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
        <StatePanel kind="loading" title="Loading recordings">
          Echoo is loading completed broadcasts and real recording jobs for {organisation.name}.
        </StatePanel>
      ) : (
        <>
          {eligibleSources.length > 0 ? (
            <section className="recording-preparation" aria-labelledby="recording-preparation-title">
              <header>
                <div>
                  <span className="recording-section-kicker">Completed broadcasts</span>
                  <h3 id="recording-preparation-title">Prepare a replay</h3>
                  <p>Create a recording job only for broadcasts that actually completed.</p>
                </div>
                <span className="recording-eligible-count">{eligibleSources.length} ready to prepare</span>
              </header>
              <div className="recording-preparation-list">
                {eligibleSources.map((source) => (
                  <article key={source.broadcast.id}>
                    <div className="recording-preparation-copy">
                      <span>{source.channel.name}</span>
                      <strong>{source.broadcast.title}</strong>
                      <small>Completed {formatDate(source.broadcast.endedAt)}</small>
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
            </section>
          ) : null}

          {recordings.length === 0 ? (
            <StatePanel compact kind="empty" title="No recordings yet">
              Completed broadcasts appear here after a real recording job is created. Echoo does not invent replay data.
            </StatePanel>
          ) : (
            <section className="recordings-library" aria-labelledby="recordings-library-title">
              <header className="recordings-library-toolbar">
                <div>
                  <h3 id="recordings-library-title">Recording library</h3>
                  <span>{filteredRecordings.length} of {recordings.length}</span>
                </div>
                <SearchField
                  label="Search recordings"
                  onChange={(event) => setRecordingQuery(event.target.value)}
                  placeholder="Search title or channel"
                  value={recordingQuery}
                />
              </header>
              <FilterTabs
                ariaLabel="Filter recordings"
                onChange={(value) => setRecordingFilter(value as RecordingFilter)}
                tabs={recordingTabs}
                value={recordingFilter}
              />
              {filteredRecordings.length > 0 ? <div className="recordings-reference-list" aria-label="Organisation recordings">
              {filteredRecordings.map((recording) => {
                const channel = channelById.get(recording.channelId);
                const destination = replayDestination(recording, organisation, channel);
                const presentation = statusPresentation(recording.status);
                const actions = availableActions(recording.status);
                const processing = PROCESSING_RECORDING_STATUSES.has(recording.status);

                return (
                  <article className="recording-reference-row" key={recording.id}>
                    <div className="recording-reference-artwork" aria-hidden="true"><Icon name="recording" size={22} /></div>

                    <div className="recording-reference-copy">
                      <h3>{recording.broadcast.title}</h3>
                      <p>
                        {formatDate(recordingDate(recording))}
                        <span aria-hidden="true"> • </span>
                        {formatDuration(recording.durationMs)}
                      </p>
                    </div>

                    <div className={`recording-reference-status is-${presentation.tone}`}>
                      <span aria-hidden="true" />
                      <strong>{presentation.label}</strong>
                    </div>

                    <div className="recording-reference-primary-action">
                      {destination ? (
                        <LinkButton href={destination.href} variant="secondary">
                          {destination.label}
                        </LinkButton>
                      ) : recording.status === 'ready' && canManage ? (
                        <Button
                          loading={updatingId === recording.id}
                          onClick={() => void changeStatus(recording, 'published')}
                          variant="secondary"
                        >
                          Publish
                        </Button>
                      ) : processing ? (
                        <button
                          aria-label={`${recording.broadcast.title} is processing`}
                          className="recording-processing-action"
                          disabled
                          type="button"
                        >
                          •••
                        </button>
                      ) : null}
                    </div>

                    <details className="recording-more-menu">
                      <summary aria-label={`More options for ${recording.broadcast.title}`}>⋮</summary>
                      <div className="recording-more-popover">
                        <div className="recording-more-copy">
                          <strong>{recording.channel.name}</strong>
                          <span>{replayGuidance(recording, channel?.visibility)}</span>
                        </div>

                        <dl>
                          <div><dt>Updated</dt><dd>{formatDateTime(recording.updatedAt)}</dd></div>
                          <div><dt>File size</dt><dd>{formatSize(recording.sizeBytes)}</dd></div>
                          <div><dt>Format</dt><dd>{recording.mediaFormat?.toUpperCase() ?? 'Pending'}</dd></div>
                          <div><dt>Retries</dt><dd>{recording.retryCount}</dd></div>
                        </dl>

                        {recording.processingError ? (
                          <div className="recording-row-error" role="alert">
                            <strong>Processing failed</strong>
                            <span>{recording.processingError}</span>
                          </div>
                        ) : null}

                        {canManage && actions.length > 0 ? (
                          <div className="recording-more-actions">
                            {actions.map((action) => (
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
                        ) : null}
                      </div>
                    </details>
                  </article>
                );
              })}
              </div> : <StatePanel compact kind="empty" title="No recordings match">
                Change the search or filter to see other recordings in this workspace.
              </StatePanel>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
