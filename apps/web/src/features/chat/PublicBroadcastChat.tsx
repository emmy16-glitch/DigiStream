import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PublicBroadcast, PublicBroadcastResponse } from '@digistream/contracts';
import { Button } from '../../design-system/components';
import { Icon } from '../../design-system/Icon';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import type { ListenerRoute } from '../listening/listener-route';
import { BroadcastChat } from './BroadcastChat';

type PublicBroadcastChatProps = {
  route: Extract<ListenerRoute, { kind: 'public-broadcast' }>;
};

export function PublicBroadcastChat({ route }: PublicBroadcastChatProps) {
  const [broadcast, setBroadcast] = useState<PublicBroadcast | null>(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  const metadataPath = useMemo(
    () =>
      `/api/v1/broadcasts/${encodeURIComponent(
        route.organisationSlug,
      )}/${encodeURIComponent(route.channelSlug)}/${encodeURIComponent(
        route.broadcastSlug,
      )}`,
    [route],
  );

  const loadBroadcast = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await apiRequest<PublicBroadcastResponse>(metadataPath, {
        signal: signal ?? null,
      });
      setBroadcast(response.broadcast);
      setError('');
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        return;
      }
      setError(
        requestError instanceof ApiClientError && requestError.code === 'API_UNREACHABLE'
          ? 'Chat temporarily lost its connection. Try again when your connection is available.'
          : requestError instanceof ApiClientError
            ? requestError.message
            : 'Chat could not load for this broadcast.',
      );
    }
  }, [metadataPath]);

  const retry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await loadBroadcast();
    } finally {
      setRetrying(false);
    }
  }, [loadBroadcast, retrying]);

  useEffect(() => {
    const controller = new AbortController();
    void loadBroadcast(controller.signal);
    const timer = window.setInterval(() => {
      void loadBroadcast();
    }, 8_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [loadBroadcast]);

  if (error) {
    return (
      <section
        aria-label="Broadcast chat unavailable"
        aria-live="polite"
        className="broadcast-chat broadcast-chat-listener broadcast-chat-scheduled-state"
      >
        <div className="broadcast-chat-scheduled-copy">
          <Icon name="chat" size={21} />
          <div>
            <strong>Chat is unavailable.</strong>
            <span>{error}</span>
          </div>
        </div>
        <Button loading={retrying} onClick={() => void retry()} variant="ghost">
          Try again
        </Button>
      </section>
    );
  }
  if (!broadcast) {
    return (
      <section className="broadcast-chat broadcast-chat-listener">
        <div className="broadcast-chat-empty">Loading broadcast conversation…</div>
      </section>
    );
  }

  if (broadcast.status === 'draft') {
    return (
      <section
        aria-label="Broadcast chat availability"
        aria-live="polite"
        className="broadcast-chat broadcast-chat-listener broadcast-chat-scheduled-state"
      >
        <div className="broadcast-chat-scheduled-copy">
          <Icon name="chat" size={21} />
          <div>
            <strong>Chat is not open for this draft.</strong>
            <span>The creator must prepare the broadcast before listeners can join the conversation.</span>
          </div>
        </div>
      </section>
    );
  }

  if (broadcast.status === 'scheduled' || broadcast.status === 'starting') {
    const starting = broadcast.status === 'starting';
    return (
      <section
        aria-label="Broadcast chat availability"
        aria-live="polite"
        className="broadcast-chat broadcast-chat-listener broadcast-chat-scheduled-state"
      >
        <div className="broadcast-chat-scheduled-copy">
          <Icon name="chat" size={21} />
          <div>
            <strong>
              {starting
                ? 'Chat will open when public audio is ready.'
                : 'Chat will open when the broadcast starts.'}
            </strong>
            <span>
              Messages and the composer will appear automatically when the broadcast becomes available.
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <BroadcastChat
      broadcastId={broadcast.id}
      messagesPath={`${metadataPath}/chat/messages`}
      organisationId={broadcast.organisation.id}
      variant="listener"
    />
  );
}
