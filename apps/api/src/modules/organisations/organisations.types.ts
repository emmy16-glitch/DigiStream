export type OrganisationRole =
  | 'owner'
  | 'admin'
  | 'broadcaster'
  | 'moderator'
  | 'analyst';

export type OrganisationDto = {
  id: string;
  name: string;
  slug: string;
  role: OrganisationRole;
  isPersonalWorkspace: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateOrganisationInput = {
  name: string;
  slug: string;
};

export type UpdateOrganisationInput = {
  name?: string;
  slug?: string;
};
