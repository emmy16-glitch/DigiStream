export type MediaRelayProtocol = 'rtmp' | 'srt';

export type MediaRelayStatus =
  | 'starting'
  | 'active'
  | 'stopping'
  | 'stopped'
  | 'failed';

export type StartMediaRelayRequest = {
  broadcastId: string;
  roomName: string;
  targetUrl: string;
  protocol: MediaRelayProtocol;
};

export type MediaRelayJob = {
  externalId: string;
  status: MediaRelayStatus;
  failureReason: string | null;
};

export class MediaRelayProviderError extends Error {
  constructor(
    readonly code:
      | 'invalid_configuration'
      | 'request_failed'
      | 'invalid_response'
      | 'job_not_found',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'MediaRelayProviderError';
  }
}

export interface MediaRelayProvider {
  readonly provider: 'livekit_egress';
  startAudioRelay(request: StartMediaRelayRequest): Promise<MediaRelayJob>;
  inspectRelay(externalId: string): Promise<MediaRelayJob>;
  stopRelay(externalId: string): Promise<MediaRelayJob>;
}
