import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const landingPageUrl = new URL(
  '../../web/src/landing/LandingPage.tsx',
  import.meta.url,
);
const landingCssUrl = new URL(
  '../../web/src/landing/landing-page.css',
  import.meta.url,
);

test('landing page uses Echoo branding and real product routes', async () => {
  const page = await readFile(landingPageUrl, 'utf8');

  assert.match(page, /<BrandLockup \/>/);
  assert.match(page, /aria-label="Echoo home"/);
  assert.match(page, /href="\/signup"/);
  assert.match(page, /href="\/listen"/);
  assert.match(page, /href="\/login"/);
  assert.doesNotMatch(page, /DigiStream|DIGISTREAM/);
});

test('landing page matches the approved Echoo content structure without fake metrics', async () => {
  const page = await readFile(landingPageUrl, 'utf8');

  assert.match(page, /Live audio\./);
  assert.match(page, /Real connection\./);
  assert.match(page, /Zero limits\./);
  assert.match(page, /Live Broadcast/);
  assert.match(page, /HD Audio/);
  assert.match(page, /Private Calls/);
  assert.match(page, /Record & Share/);
  assert.match(page, /Built for creators and communities/);
  assert.doesNotMatch(
    page,
    /\b\d+(?:\.\d+)?K?\+?\s+(?:active creators|listeners|plays)\b/i,
  );
  assert.doesNotMatch(page, /landing-editorial-visual|EXAMPLE · UPCOMING/);
});

test('landing styles use the shared Echoo light system and remain responsive', async () => {
  const css = await readFile(landingCssUrl, 'utf8');

  assert.match(css, /--landing-canvas:\s*var\(--ds-canvas\)/);
  assert.match(css, /--landing-accent:\s*var\(--ds-pink-700\)/);
  assert.match(css, /\.landing-frame[\s\S]*border-radius:\s*var\(--ds-radius-xl\)/);
  assert.match(css, /\.landing-feature-grid[\s\S]*grid-template-columns:\s*repeat\(4,/);
  assert.match(css, /@media \(max-width:\s*600px\)/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.landing-button-primary[\s\S]*background:\s*var\(--ds-brand-strong\)/);
  assert.doesNotMatch(css, /#0d5be8|border-radius:\s*0/);
  assert.doesNotMatch(css, /Instrument Serif|#f7f2ea|#a87952/);
});
