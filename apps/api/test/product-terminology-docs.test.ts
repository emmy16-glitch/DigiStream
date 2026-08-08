import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const hardeningUrl = new URL(
  '../../../docs/PRODUCT_DESIGN_AND_FLOW_HARDENING.md',
  import.meta.url,
);

const allowedCompatibilityNames = [
  'CreatorBackstageWorkspace',
  '/backstage/*',
  'BackstageParticipant',
];

test('product hardening guidance uses Studio Lobby for creator-facing terminology', async () => {
  const document = await readFile(hardeningUrl, 'utf8');
  let creatorFacingText = document;

  for (const compatibilityName of allowedCompatibilityNames) {
    creatorFacingText = creatorFacingText.replaceAll(compatibilityName, '');
  }

  assert.match(document, /`Studio Lobby` for call-ins, guests and on-stage participants/);
  assert.match(document, /## Workstream 5 — Studio Lobby information architecture/);
  assert.doesNotMatch(creatorFacingText, /\bBackstage\b|\bbackstage\b/);
});

test('product hardening guidance cannot restore the retired dark identity', async () => {
  const document = await readFile(hardeningUrl, 'utf8');

  assert.match(document, /approved Echoo light visual identity/);
  assert.doesNotMatch(document, /useful dark visual identity/);
});
