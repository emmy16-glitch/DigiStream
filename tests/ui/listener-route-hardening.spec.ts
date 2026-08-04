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

test('duplicate separators and trailing slashes are rejected instead of changing route meaning', () => {
  const invalidRoutes = [
    '//listen/community-radio/main-stage/evening-service',
    '/listen//community-radio/main-stage/evening-service',
    '/listen/community-radio//main-stage/evening-service',
    '/listen/community-radio/main-stage//evening-service',
    '/listen/community-radio/main-stage/evening-service/',
    '/listen/replays/',
    '/listen/',
  ];

  for (const route of invalidRoutes) {
    expect(parseListenerRoute(route), route).toBeNull();
  }
});

test('double encoding, invisible formatting and oversized context are rejected', () => {
  const oversized = 'a'.repeat(129);
  const invalidRoutes = [
    '/listen/replay/org/channel/broadcast%252Fother',
    '/listen/replay/org/channel/broad%E2%80%8Bcast',
    `/listen/replay/org/channel/${oversized}`,
  ];

  for (const route of invalidRoutes) {
    expect(parseListenerRoute(route), route).toBeNull();
  }

  expect(() => memberReplayPath({
    organisationId: 'org_123',
    recordingId: `rec_${oversized}`,
  })).toThrow(TypeError);
});

test('route builders normalize equivalent Unicode context before encoding', () => {
  const decomposed = 'cafe\u0301';
  const path = publicListenerPath({
    organisationSlug: decomposed,
    channelSlug: 'main-stage',
    broadcastSlug: 'evening-service',
  });

  expect(path).toContain('caf%C3%A9');
  expect(parseListenerRoute(path)).toMatchObject({
    kind: 'public-broadcast',
    organisationSlug: 'café',
  });
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
