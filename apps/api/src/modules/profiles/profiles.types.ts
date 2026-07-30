export type PlatformCapability = 'broadcaster' | 'platform_admin';

export type PublicProfileDto = {
  id: string;
  username: string;
  displayName: string;
  biography: string | null;
  isBroadcaster: boolean;
  joinedAt: Date;
};

export type OwnProfileDto = {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended' | 'deleted';
  emailVerifiedAt: Date | null;
  joinedAt: Date;
  profile: {
    username: string;
    biography: string | null;
    isDiscoverable: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  capabilities: PlatformCapability[];
};

export type SaveProfileInput = {
  username: string;
  displayName?: string;
  biography: string | null;
  isDiscoverable: boolean;
};
