export type ChannelStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'archived';

export type ChannelVisibility = 'public' | 'unlisted' | 'private';

export type ChannelDto = {
  id: string;
  organisationId: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: ChannelStatus;
  visibility: ChannelVisibility;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicChannelDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type CreateChannelInput = {
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  visibility: ChannelVisibility;
};

export type UpdateChannelInput = Partial<{
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  visibility: ChannelVisibility;
  status: ChannelStatus;
}>;
