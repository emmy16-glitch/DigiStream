import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readRepoFile = (path: string) =>
  readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('the design system exposes semantic motion timing tokens', async () => {
  const tokens = await readRepoFile('apps/web/src/design-system/tokens.css');

  for (const token of [
    '--ds-motion-instant',
    '--ds-motion-control',
    '--ds-motion-surface',
    '--ds-motion-overlay',
    '--ds-motion-workspace',
    '--ds-motion-status',
  ]) {
    assert.match(tokens, new RegExp(`${token}:\\s*`));
  }

  assert.match(tokens, /--ds-duration-fast:\s*var\(--ds-motion-control\)/);
  assert.match(tokens, /--ds-duration-normal:\s*var\(--ds-motion-surface\)/);
  assert.match(tokens, /--ds-duration-slow:\s*var\(--ds-motion-workspace\)/);
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
