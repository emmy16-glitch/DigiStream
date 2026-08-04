import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const shellSourcePath = resolve(
  process.cwd(),
  'apps/web/src/design-system/shells.tsx',
);
const shellStylesPath = resolve(
  process.cwd(),
  'apps/web/src/design-system/creator-shell.css',
);

test('creator shell identifies the signed-in account beside account actions', async () => {
  const source = await readFile(shellSourcePath, 'utf8');

  expect(source).toContain('aria-label="Signed-in account actions"');
  expect(source).toContain('Signed in as {workspaceDescription}');
  expect(source).toContain('className="ds-creator-account-identity"');
});

test('mobile creator layout keeps sign out text visible with touch-sized actions', async () => {
  const styles = await readFile(shellStylesPath, 'utf8');

  expect(styles).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.ds-topbar-actions \.ds-button \{[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
  expect(styles).toMatch(/\.ds-topbar-actions \.ds-button span \{ display: none; \}/);
  expect(styles).toMatch(/\.ds-topbar-actions > :last-child span \{ display: inline; \}/);
});

test('very narrow creator layouts stack identity and actions instead of hiding them', async () => {
  const styles = await readFile(shellStylesPath, 'utf8');

  expect(styles).toMatch(/@media \(max-width: 380px\)[\s\S]*?\.ds-creator-account-area \{[\s\S]*?flex-direction: column;/);
  expect(styles).toMatch(/\.ds-creator-account-identity \{ width: 100%; \}/);
});
