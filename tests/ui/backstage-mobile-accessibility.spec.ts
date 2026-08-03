import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const backstageCss = readFileSync(
  new URL(
    '../../apps/web/src/features/guests/creator-backstage.css',
    import.meta.url,
  ),
  'utf8',
);

test('Backstage protects mobile safe areas and minimum touch targets', () => {
  expect(backstageCss).toContain('env(safe-area-inset-top)');
  expect(backstageCss).toContain('env(safe-area-inset-right)');
  expect(backstageCss).toContain('env(safe-area-inset-bottom)');
  expect(backstageCss).toContain('env(safe-area-inset-left)');
  expect(backstageCss).toContain('max(44px, var(--ds-control-min-height))');
  expect(backstageCss).toContain('touch-action: manipulation');
});

test('Backstage keeps keyboard focus visible and scrolling contained', () => {
  expect(backstageCss).toContain('.backstage-close:focus-visible');
  expect(backstageCss).toContain('outline: 3px solid var(--ds-focus-ring)');
  expect(backstageCss).toContain('overscroll-behavior: contain');
  expect(backstageCss).toContain('scrollbar-gutter: stable');
  expect(backstageCss).toContain('scroll-padding-block:');
});

test('Backstage preserves reduced-motion behavior including scrolling', () => {
  expect(backstageCss).toContain('@media (prefers-reduced-motion: reduce)');
  expect(backstageCss).toContain('animation: none !important');
  expect(backstageCss).toContain('scroll-behavior: auto !important');
  expect(backstageCss).toContain('transition: none !important');
});
