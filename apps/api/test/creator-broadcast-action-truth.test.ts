import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesheetUrl = new URL(
  '../../web/src/features/broadcasting/creator-broadcast-action-truth.css',
  import.meta.url,
);
const mainUrl = new URL('../../web/src/main.tsx', import.meta.url);

async function actionTruthStyles(): Promise<string> {
  return readFile(stylesheetUrl, 'utf8');
}

test('broadcast setup exposes only one creation action for the open form', async () => {
  const css = await actionTruthStyles();

  assert.match(css, /:has\(#create-channel-title\)[\s\S]*button:first-child/);
  assert.match(css, /:has\(#create-broadcast-title\)[\s\S]*button:last-child/);
  assert.match(css, /display: none;/);
});

test('broadcast action truth styles are loaded by the application entrypoint', async () => {
  const main = await readFile(mainUrl, 'utf8');

  assert.match(main, /creator-broadcast-action-truth\.css/);
});
