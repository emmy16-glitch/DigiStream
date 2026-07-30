export type DeliveryProtocol = 'webrtc' | 'llhls';

export type DeliveryEnsureRequest = {
  broadcastId: string;
  streamName: string;
  contributionRoomName: string;
  sourceUrl: string;
};

export type DeliveryHealth = {
  ready: boolean;
  connections: {
    webrtc: number;
    llhls: number;
  } | null;
};

export type DeliveryPlayback = {
  provider: 'ovenmediaengine';
  streamName: string;
  expiresAt: Date;
  sources: Array<{
    protocol: DeliveryProtocol;
    url: string;
  }>;
};

export interface DeliveryProvider {
  readonly provider: 'ovenmediaengine';
  ensureDelivery(request: DeliveryEnsureRequest): Promise<DeliveryHealth>;
  inspectDelivery(streamName: string): Promise<DeliveryHealth>;
  stopDelivery(streamName: string): Promise<void>;
  issuePlayback(streamName: string, expiresAt: Date): DeliveryPlayback;
}
