import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readRepoFile = (path: string) =>
  readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('the design system exposes semantic motion timing tokens', async () => {
  const tokens = await readRepoFile('apps/web/src/design-system/tokens.css');

  const expectedTokens = new Map([
    ['--ds-motion-instant', '100ms'],
    ['--ds-motion-control', '160ms'],
    ['--ds-motion-surface', '200ms'],
    ['--ds-motion-overlay', '260ms'],
    ['--ds-motion-workspace', '320ms'],
    ['--ds-motion-status', '220ms'],
  ]);

  for (const [token, value] of expectedTokens) {
    assert.match(tokens, new RegExp(`${token}:\\s*${value}`));
  }
});

test('legacy feature durations stay unchanged until their surfaces are audited', async () => {
  const tokens = await readRepoFile('apps/web/src/design-system/tokens.css');

  assert.match(tokens, /--ds-duration-fast:\s*120ms/);
  assert.match(tokens, /--ds-duration-normal:\s*200ms/);
  assert.match(tokens, /--ds-duration-slow:\s*320ms/);
});

test('the web entrypoint loads the final shared motion ownership layer', async () => {
  const entrypoint = await readRepoFile('apps/web/src/main.tsx');
  const guestAuditIndex = entrypoint.indexOf("guest-responsive-audit.css");
  const motionIndex = entrypoint.indexOf("motion-foundation.css");

  assert.ok(guestAuditIndex >= 0);
  assert.ok(motionIndex > guestAuditIndex);
});

test('shared controls use semantic timings and reduced motion removes movement', async () => {
  const motion = await readRepoFile(
    'apps/web/src/design-system/motion-foundation.css',
  );

  assert.match(motion, /transition-duration:\s*var\(--ds-motion-control\)/);
  assert.match(motion, /transition-duration:\s*var\(--ds-motion-instant\)/);
  assert.match(motion, /prefers-reduced-motion:\s*reduce/);
  assert.match(motion, /\.ds-spinner\s*\{[^}]*animation:\s*none/s);
  assert.match(motion, /transform:\s*none/);
  assert.doesNotMatch(motion, /\.ds-spinner\s*\{[^}]*animation-duration/s);
});
