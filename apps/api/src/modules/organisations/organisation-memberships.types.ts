import type { OrganisationRole } from './organisations.types.js';

export type OrganisationMemberDto = {
  userId: string;
  email: string;
  displayName: string;
  role: OrganisationRole;
  joinedAt: Date;
};

export type OrganisationInvitationDto = {
  id: string;
  organisationId: string;
  email: string;
  role: Exclude<OrganisationRole, 'owner'>;
  invitedByUserId: string | null;
  expiresAt: Date;
  createdAt: Date;
};

export type CreatedOrganisationInvitationDto = OrganisationInvitationDto & {
  acceptanceToken: string;
};

export type AcceptedOrganisationInvitationDto = {
  organisationId: string;
  organisationName: string;
  role: OrganisationRole;
  joinedAt: Date;
};

export type CreateOrganisationInvitationInput = {
  email: string;
  role: Exclude<OrganisationRole, 'owner'>;
  tokenHash: string;
  expiresAt: Date;
};
