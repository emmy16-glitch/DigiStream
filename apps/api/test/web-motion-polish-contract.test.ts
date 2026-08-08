import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readRepoFile = (path: string) =>
  readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('feature motion polish owns the final cascade after the shared foundation', async () => {
  const entrypoint = await readRepoFile('apps/web/src/main.tsx');
  const foundationIndex = entrypoint.indexOf('motion-foundation.css');
  const polishIndex = entrypoint.indexOf('motion-polish.css');

  assert.ok(foundationIndex >= 0);
  assert.ok(polishIndex > foundationIndex);
});

test('audited feature feedback uses semantic timings without broad or expensive transitions', async () => {
  const motion = await readRepoFile(
    'apps/web/src/design-system/motion-polish.css',
  );

  for (const token of [
    '--ds-motion-instant',
    '--ds-motion-control',
    '--ds-motion-surface',
    '--ds-motion-status',
  ]) {
    assert.match(motion, new RegExp(`var\\(${token}\\)`));
  }

  assert.doesNotMatch(motion, /transition:\s*all\b/);
  assert.doesNotMatch(motion, /transition:[^;]*\bheight\b/);
  assert.doesNotMatch(motion, /transition:[^;]*\bbox-shadow\b/);
  assert.doesNotMatch(motion, /@keyframes/);
});

test('high-frequency meters keep stable layout boxes and animate compositor transforms', async () => {
  const motion = await readRepoFile(
    'apps/web/src/design-system/motion-polish.css',
  );

  assert.match(
    motion,
    /\.ds-audio-meter-bars i,[\s\S]*\.studio-signal-meter-bars i,[\s\S]*\.guest-meter i\s*\{[^}]*height:\s*100%[^}]*transform:\s*scaleY\(\.12\)[^}]*--ds-motion-instant/s,
  );
  assert.match(motion, /\.studio-signal-meter-bars i\.is-active\s*\{[^}]*height:\s*100%[^}]*scaleY\(\.78\)/s);
  assert.match(motion, /\.guest-meter i\.hot\s*\{[^}]*height:\s*100%[^}]*scaleY\(\.88\)/s);
});

test('reduced motion fully stops audited interpolation and standalone system rotation', async () => {
  const motion = await readRepoFile(
    'apps/web/src/design-system/motion-polish.css',
  );

  assert.match(motion, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(motion, /\.echoo-call-in-panel \*/);
  assert.match(motion, /transition:\s*none\s*!important/);
  assert.match(motion, /animation:\s*none\s*!important/);
  assert.match(
    motion,
    /\.echoo-system-spinner\s*\{[^}]*animation:\s*none\s*!important/s,
  );
  assert.doesNotMatch(
    motion,
    /transition-duration\s*:\s*0\.01ms(?:\s*!important)?\s*;/,
  );
});

test('small touch-device overlays drop full-screen blur without changing geometry', async () => {
  const motion = await readRepoFile(
    'apps/web/src/design-system/motion-polish.css',
  );

  assert.match(motion, /pointer:\s*coarse/);
  assert.match(motion, /max-width:\s*760px/);
  assert.match(motion, /max-height:\s*620px/);
  for (const selector of [
    '.studio-backdrop',
    '.studio-confirmation-backdrop',
    '.backstage-backdrop',
    '.listener-call-in-backdrop',
  ]) {
    assert.ok(motion.includes(selector));
  }
  assert.match(motion, /backdrop-filter:\s*none/);
});
