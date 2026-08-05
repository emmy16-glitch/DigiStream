import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readRepoFile = (path: string) =>
  readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('the web entrypoint loads shared content resilience styles', async () => {
  const entrypoint = await readRepoFile('apps/web/src/main.tsx');
  assert.match(entrypoint, /content-resilience\.css/);
});

test('shared shells preserve long text, touch targets and safe areas', async () => {
  const stylesheet = await readRepoFile(
    'apps/web/src/design-system/content-resilience.css',
  );

  assert.match(stylesheet, /overflow-wrap:\s*anywhere/);
  assert.match(stylesheet, /text-wrap:\s*balance/);
  assert.match(stylesheet, /safe-area-inset-bottom/);
  assert.match(stylesheet, /min-block-size:\s*44px/);
});

test('short-height landscape and reduced-motion behaviour are explicit', async () => {
  const stylesheet = await readRepoFile(
    'apps/web/src/design-system/content-resilience.css',
  );

  assert.match(stylesheet, /max-height:\s*32rem/);
  assert.match(stylesheet, /orientation:\s*landscape/);
  assert.match(stylesheet, /100dvb/);
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /animation-duration:\s*0\.01ms/);
});
