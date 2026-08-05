import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesheetUrl = new URL('../../web/src/design-system/creator-shell.css', import.meta.url);

async function creatorShellStyles(): Promise<string> {
  return readFile(stylesheetUrl, 'utf8');
}

test('fixed mobile navigation reserves safe-area-aware content clearance', async () => {
  const css = await creatorShellStyles();

  assert.match(
    css,
    /--ds-mobile-nav-clearance: calc\(84px \+ env\(safe-area-inset-bottom\)\);/,
  );
  assert.match(
    css,
    /\.ds-creator-content \{[\s\S]*padding: 18px 14px calc\(34px \+ var\(--ds-mobile-nav-clearance\)\);/,
  );
  assert.match(css, /scroll-padding-bottom: var\(--ds-mobile-nav-clearance\);/);
  assert.match(
    css,
    /\.ds-creator-content > :last-child \{ scroll-margin-bottom: var\(--ds-mobile-nav-clearance\); \}/,
  );
});

test('short-height landscape keeps the same navigation clearance', async () => {
  const css = await creatorShellStyles();

  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 620px\)/);
  assert.match(
    css,
    /padding-bottom: calc\(24px \+ var\(--ds-mobile-nav-clearance\)\);/,
  );
});
