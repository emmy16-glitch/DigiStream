export type ContributionParticipantRole = 'host' | 'guest' | 'monitor';

export type ContributionRoomRequest = {
  roomName: string;
  broadcastId: string;
  organisationId: string;
  channelId: string;
};

export type ContributionCredentialRequest = ContributionRoomRequest & {
  userId: string;
  displayName: string;
  participantRole: ContributionParticipantRole;
};

export type ContributionCredential = {
  provider: 'livekit';
  url: string;
  token: string;
  roomName: string;
  participantIdentity: string;
  participantRole: ContributionParticipantRole;
  expiresAt: Date;
  permissions: {
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
    canPublishSources: readonly string[];
  };
};

export type ContributionPublisherVerificationRequest = {
  roomName: string;
  participantIdentity: string;
};

export interface ContributionProvider {
  readonly provider: 'livekit';
  readonly clientUrl: string;

  ensureRoom(request: ContributionRoomRequest): Promise<void>;

  issueCredential(
    request: ContributionCredentialRequest,
  ): Promise<ContributionCredential>;

  verifyPublishedMicrophone?(
    request: ContributionPublisherVerificationRequest,
  ): Promise<boolean>;
}

export class ContributionProviderError extends Error {
  constructor(
    readonly code:
      | 'invalid_configuration'
      | 'request_failed'
      | 'invalid_response',
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ContributionProviderError';
  }
}
