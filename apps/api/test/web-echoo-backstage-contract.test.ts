import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const backstageUrl = new URL(
  '../../web/src/features/guests/CreatorBackstageWorkspace.tsx',
  import.meta.url,
);
const echooCssUrl = new URL(
  '../../web/src/features/guests/echoo-backstage.css',
  import.meta.url,
);
const mainUrl = new URL('../../web/src/main.tsx', import.meta.url);

test('Echoo Backstage preserves the real call-in, invitation and participant APIs', async () => {
  const source = await readFile(backstageUrl, 'utf8');

  assert.match(source, /\$\{base\}\/call-ins/);
  assert.match(source, /\$\{base\}\/guest-invitations/);
  assert.match(source, /\$\{base\}\/backstage\/participants/);
  assert.match(source, /\/call-ins\/\$\{callIn\.id\}\/\$\{decision\}/);
  assert.match(source, /\/guest-invitations\/\$\{invitationId\}\/admit/);
  assert.match(source, /\/backstage\/participants\/\$\{encodeURIComponent\(participant\.identity\)\}\/mute/);
  assert.match(source, /method: 'DELETE'/);
});

test('Backstage keeps the complete producer flow without inventing audience data', async () => {
  const source = await readFile(backstageUrl, 'utf8');

  assert.match(source, />\s*Call-ins\s*</);
  assert.match(source, /Create guest link/);
  assert.match(source, />\s*Connected participants\s*</);
  assert.match(source, />\s*Approve\s*</);
  assert.match(source, />\s*Reject\s*</);
  assert.match(source, />\s*Admit\s*</);
  assert.match(source, />\s*Revoke\s*</);
  assert.match(source, /microphone\.muted \? 'Unmute' : 'Mute'/);
  assert.match(source, />\s*Remove\s*</);
  assert.doesNotMatch(source, /\b\d+(?:\.\d+)?K?\+?\s+(?:listeners|fans|speakers)\b/i);
  assert.doesNotMatch(source, />\s*Analytics\s*</);
});

test('Echoo Backstage presents Call-ins before invited guests and on-stage participants', async () => {
  const css = await readFile(echooCssUrl, 'utf8');

  assert.match(css, /Information architecture: Call-ins -> Invited guests -> On stage/);
  assert.match(css, /\.backstage-panels > \.backstage-panel:nth-of-type\(3\)[\s\S]*order:\s*1/);
  assert.match(css, /\.backstage-panels > \.backstage-panel:nth-of-type\(1\)[\s\S]*order:\s*2/);
  assert.match(css, /\.backstage-panels > \.backstage-panel:nth-of-type\(2\)[\s\S]*order:\s*3/);
  assert.match(css, /grid-template-columns:\s*minmax\(255px, 290px\) minmax\(0, 1fr\)/);
  assert.match(css, /background:\s*var\(--ds-accent-lavender-soft\)/);
  assert.doesNotMatch(css, /#071a36|#0b2449|#123a70/);
});

test('Echoo Backstage stays responsive, safe-area aware and focus visible', async () => {
  const css = await readFile(echooCssUrl, 'utf8');
  const main = await readFile(mainUrl, 'utf8');

  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*1100px\)/);
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /@media \(orientation:\s*landscape\) and \(max-height:\s*620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(main, /features\/guests\/echoo-backstage\.css/);
  assert.ok(
    main.indexOf("./features/guests/echoo-backstage.css") >
      main.indexOf("./design-system/manual-review-fixes.css"),
  );
});
