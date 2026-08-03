import { expect, test } from '@playwright/test';
import {
  memberReplayPath,
  parseListenerRoute,
  publicListenerPath,
  publicReplayPath,
} from '../../apps/web/src/features/listening/listener-route';

test('valid listener and Replay routes retain exact authoritative context', () => {
  const publicPath = publicListenerPath({
    organisationSlug: 'community-radio',
    channelSlug: 'main-stage',
    broadcastSlug: 'evening-service',
  });
  const replayPath = publicReplayPath({
    organisationSlug: 'community-radio',
    channelSlug: 'main-stage',
    broadcastSlug: 'evening-service',
  });
  const memberPath = memberReplayPath({
    organisationId: 'org_123',
    recordingId: 'rec_456',
  });

  expect(parseListenerRoute(publicPath)).toEqual({
    kind: 'public-broadcast',
    organisationSlug: 'community-radio',
    channelSlug: 'main-stage',
    broadcastSlug: 'evening-service',
  });
  expect(parseListenerRoute(replayPath)).toEqual({
    kind: 'public-replay',
    organisationSlug: 'community-radio',
    channelSlug: 'main-stage',
    broadcastSlug: 'evening-service',
  });
  expect(parseListenerRoute(memberPath)).toEqual({
    kind: 'member-replay',
    organisationId: 'org_123',
    recordingId: 'rec_456',
  });
});

test('decoded separators, traversal markers and control characters are rejected', () => {
  const invalidRoutes = [
    '/listen/replay/org%2Fother/channel/broadcast',
    '/listen/replay/org/channel/%2E%2E',
    '/listen/member-replay/org%5Cother/recording',
    '/listen/member-replay/org/recording%3Fdownload',
    '/listen/org/channel/broadcast%00hidden',
  ];

  for (const route of invalidRoutes) {
    expect(parseListenerRoute(route), route).toBeNull();
  }
});

test('route builders fail closed instead of generating ambiguous listener URLs', () => {
  expect(() => publicReplayPath({
    organisationSlug: 'org/other',
    channelSlug: 'channel',
    broadcastSlug: 'broadcast',
  })).toThrow(TypeError);

  expect(() => memberReplayPath({
    organisationId: '..',
    recordingId: 'recording',
  })).toThrow(TypeError);

  expect(() => publicListenerPath({
    organisationSlug: 'org',
    channelSlug: 'channel',
    broadcastSlug: 'broadcast?preview=true',
  })).toThrow(TypeError);
});
