import { useEffect, useMemo, useState } from 'react';
import type { PublicBroadcast, PublicBroadcastResponse } from '@digistream/contracts';
import { ApiClientError, apiRequest } from '../../lib/api-client';
import type { ListenerRoute } from '../listening/listener-route';
import { BroadcastChat } from './BroadcastChat';

type PublicBroadcastChatProps = {
  route: Extract<ListenerRoute, { kind: 'public-broadcast' }>;
};

export function PublicBroadcastChat({ route }: PublicBroadcastChatProps) {
  const [broadcast, setBroadcast] = useState<PublicBroadcast | null>(null);
  const [error, setError] = useState('');

  const metadataPath = useMemo(
    () =>
      `/api/v1/broadcasts/${encodeURIComponent(
        route.organisationSlug,
      )}/${encodeURIComponent(route.channelSlug)}/${encodeURIComponent(
        route.broadcastSlug,
      )}`,
    [route],
  );

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    void apiRequest<PublicBroadcastResponse>(metadataPath, {
      signal: controller.signal,
    })
      .then((response) => setBroadcast(response.broadcast))
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') {
          return;
        }
        setError(
          requestError instanceof ApiClientError
            ? requestError.message
            : 'Live chat metadata could not be loaded.',
        );
      });
    return () => controller.abort();
  }, [metadataPath]);

  if (error) {
    return (
      <section className="broadcast-chat broadcast-chat-listener">
        <div className="broadcast-chat-empty">{error}</div>
      </section>
    );
  }
  if (!broadcast) {
    return (
      <section className="broadcast-chat broadcast-chat-listener">
        <div className="broadcast-chat-empty">Loading live chat…</div>
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
