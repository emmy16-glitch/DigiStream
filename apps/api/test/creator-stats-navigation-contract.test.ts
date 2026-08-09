import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { visibleCreatorNavigation } from '../../web/src/design-system/creator-navigation-visibility.ts';

const shellUrl = new URL('../../web/src/design-system/shells.tsx', import.meta.url);
const shellCssUrl = new URL('../../web/src/design-system/creator-shell.css', import.meta.url);

test('implemented Stats stays visible in creator navigation', () => {
  const items = [
    { label: 'Overview' },
    { label: 'Broadcasts' },
    { label: 'Studio Lobby' },
    { label: 'Chat' },
    { label: 'Recordings' },
    { label: 'Analytics' },
  ];

  assert.deepEqual(visibleCreatorNavigation(items), items);
});

test('creator shells keep all six destinations reachable and present Analytics as Stats', async () => {
  const [shell, css] = await Promise.all([
    readFile(shellUrl, 'utf8'),
    readFile(shellCssUrl, 'utf8'),
  ]);

  assert.match(shell, /const primaryMobileNavigation = visibleNavigation\.slice\(0, 4\)/);
  assert.match(shell, /const secondaryMobileNavigation = visibleNavigation\.slice\(4\)/);
  assert.match(shell, /aria-label="More creator destinations"/);
  assert.match(shell, /secondaryMobileNavigation\.map/);
  assert.match(shell, /creatorFacingLabel\(label: string\)/);
  assert.match(shell, /label === 'Analytics' \? 'Stats' : label/);
  assert.match(shell, /<h1>\{visibleTitle\}<\/h1>/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media \(min-width: 641px\) and \(max-height: 620px\)[\s\S]*?\.ds-creator-sidebar\s*\{[\s\S]*?padding-block:\s*8px;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /@media \(min-width: 641px\) and \(max-height: 620px\)[\s\S]*?\.ds-creator-navigation\s*\{[\s\S]*?margin-top:\s*8px;[\s\S]*?gap:\s*2px;/);
});
