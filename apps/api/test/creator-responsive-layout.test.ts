import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesheetUrl = new URL('../../web/src/styles.css', import.meta.url);

async function creatorStyles(): Promise<string> {
  return readFile(stylesheetUrl, 'utf8');
}

test('creator workspace text can wrap without forcing horizontal overflow', async () => {
  const css = await creatorStyles();

  assert.match(css, /\.workspace-welcome h2,[\s\S]*overflow-wrap: anywhere;/);
  assert.match(css, /\.workspace-welcome-actions \.ds-button \{[\s\S]*white-space: normal;/);
  assert.match(css, /\.workspace-onboarding input \{[\s\S]*min-width: 0;/);
  assert.match(css, /\.ds-creator-account-identity \{[\s\S]*overflow-wrap: anywhere;/);
});

test('creator workspace preserves safe areas and usable short-height layouts', async () => {
  const css = await creatorStyles();

  assert.match(css, /padding-inline: max\(12px, env\(safe-area-inset-left\)\) max\(12px, env\(safe-area-inset-right\)\);/);
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 480px\)/);
  assert.match(css, /\.signal-visual \{ display: none; \}/);
});

test('creator workspace removes nonessential motion when requested', async () => {
  const css = await creatorStyles();

  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration: \.01ms !important;/);
  assert.match(css, /scroll-behavior: auto !important;/);
  assert.match(css, /transition-duration: \.01ms !important;/);
});
