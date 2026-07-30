export type GuestInvitationStatus =
  | 'pending'
  | 'accepted'
  | 'admitted'
  | 'revoked';

export type CallInStatus = 'pending' | 'approved' | 'rejected';

export type GuestInvitationDto = {
  id: string;
  organisationId: string;
  broadcastId: string;
  invitedEmail: string | null;
  displayName: string | null;
  status: GuestInvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  admittedAt: Date | null;
  revokedAt: Date | null;
  sessionExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreatedGuestInvitationDto = GuestInvitationDto & {
  acceptanceToken: string;
};

export type GuestSessionDto = {
  invitationId: string;
  organisationId: string;
  broadcastId: string;
  displayName: string;
  admitted: boolean;
  expiresAt: Date;
  sessionToken: string;
};

export type CallInRequestDto = {
  id: string;
  organisationId: string;
  broadcastId: string;
  displayName: string;
  contactEmail: string | null;
  message: string | null;
  status: CallInStatus;
  invitationId: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
