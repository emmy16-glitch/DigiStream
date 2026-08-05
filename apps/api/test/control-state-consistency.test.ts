import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readRepoFile = (path: string) =>
  readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('the web entrypoint loads the shared control-state stylesheet', async () => {
  const entrypoint = await readRepoFile('apps/web/src/main.tsx');
  assert.match(entrypoint, /control-state-consistency\.css/);
});

test('disabled buttons and icon buttons retain visible, non-interactive treatment', async () => {
  const stylesheet = await readRepoFile(
    'apps/web/src/design-system/control-state-consistency.css',
  );

  for (const selector of [
    ".ds-button:disabled",
    ".ds-button[aria-disabled='true']",
    ".ds-icon-button:disabled",
    ".ds-icon-button[aria-disabled='true']",
  ]) {
    assert.match(stylesheet, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(stylesheet, /cursor:\s*not-allowed/);
  assert.match(stylesheet, /opacity:\s*1/);
  assert.match(stylesheet, /forced-colors:\s*active/);
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
});

test('busy controls communicate waiting without press motion', async () => {
  const stylesheet = await readRepoFile(
    'apps/web/src/design-system/control-state-consistency.css',
  );

  assert.match(stylesheet, /aria-busy='true'/);
  assert.match(stylesheet, /cursor:\s*wait/);
  assert.match(stylesheet, /transform:\s*none/);
});
