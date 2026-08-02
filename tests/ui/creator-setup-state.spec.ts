import { expect, test } from '@playwright/test';
import { creatorSetupState } from '../../apps/web/src/features/onboarding/creator-setup-state';

test('new users choose listener or creator intent before workspace setup', () => {
  expect(
    creatorSetupState({
      intentChosen: false,
      hasOrganisation: false,
      channelStatus: 'none',
      broadcastStatus: 'none',
    }),
  ).toBe('choose_intent');
});

test('creator setup advances through existing organisation, channel and broadcast prerequisites', () => {
  expect(
    creatorSetupState({
      intentChosen: true,
      hasOrganisation: false,
      channelStatus: 'none',
      broadcastStatus: 'none',
    }),
  ).toBe('create_organisation');

  expect(
    creatorSetupState({
      intentChosen: true,
      hasOrganisation: true,
      channelStatus: 'none',
      broadcastStatus: 'none',
    }),
  ).toBe('create_channel');

  expect(
    creatorSetupState({
      intentChosen: true,
      hasOrganisation: true,
      channelStatus: 'pending_review',
      broadcastStatus: 'none',
    }),
  ).toBe('finish_channel_activation');

  expect(
    creatorSetupState({
      intentChosen: true,
      hasOrganisation: true,
      channelStatus: 'active',
      broadcastStatus: 'none',
    }),
  ).toBe('create_broadcast');
});

test('broadcast lifecycle produces truthful preparation, live-management and completion destinations', () => {
  for (const broadcastStatus of ['draft', 'scheduled', 'starting'] as const) {
    expect(
      creatorSetupState({
        intentChosen: true,
        hasOrganisation: true,
        channelStatus: 'active',
        broadcastStatus,
      }),
    ).toBe('prepare_broadcast');
  }

  for (const broadcastStatus of ['live', 'reconnecting', 'ending'] as const) {
    expect(
      creatorSetupState({
        intentChosen: true,
        hasOrganisation: true,
        channelStatus: 'active',
        broadcastStatus,
      }),
    ).toBe('manage_live_broadcast');
  }

  for (const broadcastStatus of ['completed', 'cancelled', 'failed'] as const) {
    expect(
      creatorSetupState({
        intentChosen: true,
        hasOrganisation: true,
        channelStatus: 'active',
        broadcastStatus,
      }),
    ).toBe('view_completed_broadcast');
  }
});

test('inactive channels cannot skip activation because a broadcast status exists', () => {
  expect(
    creatorSetupState({
      intentChosen: true,
      hasOrganisation: true,
      channelStatus: 'suspended',
      broadcastStatus: 'live',
    }),
  ).toBe('finish_channel_activation');
});
