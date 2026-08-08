import { expect, test } from '@playwright/test';
import { visibleCreatorNavigation } from '../../apps/web/src/design-system/creator-navigation-visibility';

const navigation = [
  { label: 'Overview', shortLabel: 'Home' },
  { label: 'Broadcasts', shortLabel: 'Streams' },
  { label: 'Studio Lobby', shortLabel: 'Lobby' },
  { label: 'Chat', shortLabel: 'Chat' },
  { label: 'Recordings', shortLabel: 'Replay' },
  { label: 'Analytics', shortLabel: 'Stats' },
];

test('implemented creator navigation exposes authoritative Stats', () => {
  const visible = visibleCreatorNavigation(navigation);

  expect(visible.map((item) => item.label)).toEqual([
    'Overview',
    'Broadcasts',
    'Studio Lobby',
    'Chat',
    'Recordings',
    'Analytics',
  ]);
  expect(visible.find((item) => item.shortLabel === 'Chat')).toBeTruthy();
  expect(visible.find((item) => item.shortLabel === 'Replay')).toBeTruthy();
  expect(visible.find((item) => item.shortLabel === 'Stats')).toBeTruthy();
});

test('navigation filtering is non-mutating and preserves authoritative order', () => {
  const before = navigation.map((item) => item.label);
  const visible = visibleCreatorNavigation(navigation);

  expect(navigation.map((item) => item.label)).toEqual(before);
  expect(visible).not.toBe(navigation);
  expect(visible[3]?.label).toBe('Chat');
  expect(visible[4]?.label).toBe('Recordings');
  expect(visible[5]?.label).toBe('Analytics');
});
