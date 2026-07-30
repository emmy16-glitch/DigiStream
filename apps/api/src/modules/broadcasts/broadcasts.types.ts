export type BroadcastStatus =
  | 'draft'
  | 'scheduled'
  | 'starting'
  | 'live'
  | 'reconnecting'
  | 'ending'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type BroadcastDto = {
  id: string;
  organisationId: string;
  channelId: string;
  createdByUserId: string;
  title: string;
  slug: string;
  description: string | null;
  status: BroadcastStatus;
  scheduledStartAt: Date | null;
  startRequestedAt: Date | null;
  liveStartedAt: Date | null;
  endRequestedAt: Date | null;
  endedAt: Date | null;
  cancelledAt: Date | null;
  contributionRoomName: string;
  deliveryStreamName: string;
  contributionReadyAt: Date | null;
  deliveryReadyAt: Date | null;
  failureReason: string | null;
  lifecycleVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicBroadcastDto = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: BroadcastStatus;
  scheduledStartAt: Date | null;
  liveStartedAt: Date | null;
  endedAt: Date | null;
  organisation: {
    id: string;
    name: string;
    slug: string;
  };
  channel: {
    id: string;
    name: string;
    slug: string;
    category: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBroadcastInput = {
  title: string;
  slug: string;
  description: string | null;
  scheduledStartAt: Date | null;
  status: 'draft' | 'scheduled';
  contributionRoomName: string;
  deliveryStreamName: string;
};

export type UpdateBroadcastInput = {
  title?: string;
  slug?: string;
  description?: string | null;
  scheduledStartAt?: Date | null;
  status?: BroadcastStatus;
  startRequestedAt?: Date | null;
  liveStartedAt?: Date | null;
  endRequestedAt?: Date | null;
  endedAt?: Date | null;
  cancelledAt?: Date | null;
  contributionReadyAt?: Date | null;
  deliveryReadyAt?: Date | null;
  failureReason?: string | null;
};

export type BroadcastCommandName =
  | 'schedule'
  | 'start'
  | 'cancel'
  | 'end'
  | 'contribution_ready'
  | 'delivery_ready'
  | 'source_lost'
  | 'delivery_lost'
  | 'failed'
  | 'delivery_stopped';

export type BroadcastMediaEvent = Extract<
  BroadcastCommandName,
  | 'contribution_ready'
  | 'delivery_ready'
  | 'source_lost'
  | 'delivery_lost'
  | 'failed'
  | 'delivery_stopped'
>;

export type BroadcastTransitionPatch = UpdateBroadcastInput & {
  status: BroadcastStatus;
};

export type BroadcastTransitionResult =
  | { status: 'updated'; broadcast: BroadcastDto }
  | { status: 'replayed'; broadcast: BroadcastDto }
  | { status: 'not_found' }
  | { status: 'idempotency_conflict' }
  | { status: 'version_conflict'; currentVersion: number }
  | { status: 'invalid_state'; currentStatus: BroadcastStatus };
