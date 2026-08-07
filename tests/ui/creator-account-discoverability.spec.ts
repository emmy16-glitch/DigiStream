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
const manualFixesPath = resolve(
  process.cwd(),
  'apps/web/src/design-system/manual-review-fixes.css',
);
const baseStylesPath = resolve(
  process.cwd(),
  'apps/web/src/design-system/base.css',
);
const appSourcePath = resolve(process.cwd(), 'apps/web/src/App.tsx');

test('creator shell identifies the signed-in account beside account actions', async () => {
  const source = await readFile(shellSourcePath, 'utf8');

  expect(source).toContain('aria-label="Signed-in account actions"');
  expect(source).toContain('Signed in as {workspaceDescription}');
  expect(source).toContain('className="ds-creator-account-identity"');
});

test('mobile creator layout keeps sign out text visible with touch-sized actions', async () => {
  const [styles, fixes, app] = await Promise.all([
    readFile(shellStylesPath, 'utf8'),
    readFile(manualFixesPath, 'utf8'),
    readFile(appSourcePath, 'utf8'),
  ]);

  expect(styles).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.ds-topbar-actions \.ds-button \{[\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
  expect(styles).toMatch(/\.ds-topbar-actions \.ds-button span \{ display: none; \}/);
  expect(fixes).toContain('.ds-creator-account-area .ds-button[aria-label^="Sign out "]');
  expect(fixes).toMatch(/\[aria-label\^="Sign out "\][\s\S]*?min-width: 44px;[\s\S]*?min-height: 44px;/);
  expect(fixes).toMatch(/@media \(max-width: 640px\)[\s\S]*?\[aria-label\^="Sign out "\] span \{[\s\S]*?display: inline;/);
  expect(app).toContain('aria-label={`Sign out ${user.displayName}`}');
  expect(app).toContain('>\n        Sign out\n      </Button>');
});

test('very narrow creator layouts stack identity and actions instead of hiding them', async () => {
  const styles = await readFile(shellStylesPath, 'utf8');

  expect(styles).toMatch(/@media \(max-width: 380px\)[\s\S]*?\.ds-creator-account-area \{[\s\S]*?flex-direction: column;/);
  expect(styles).toMatch(/\.ds-creator-account-identity \{ width: 100%; \}/);
});

test('account actions retain visible keyboard focus', async () => {
  const [base, fixes] = await Promise.all([
    readFile(baseStylesPath, 'utf8'),
    readFile(manualFixesPath, 'utf8'),
  ]);

  expect(base).toContain(':where(a, button, input, select, textarea, [tabindex]):focus-visible');
  expect(base).toContain('outline: 2px solid var(--ds-focus-ring);');
  expect(fixes).toContain('.ds-creator-account-area:focus-within');
});

test('inline account access does not steal Escape or Android Back history ownership', async () => {
  const [shell, app, fixes] = await Promise.all([
    readFile(shellSourcePath, 'utf8'),
    readFile(appSourcePath, 'utf8'),
    readFile(manualFixesPath, 'utf8'),
  ]);

  expect(shell).not.toContain('aria-modal="true"');
  expect(shell).not.toContain('useModalHistoryDismiss');
  expect(shell).not.toContain('history.pushState');
  expect(app).not.toContain('digistreamCreatorAccount');
  expect(fixes).toContain('does not claim browser/Android');
  expect(fixes).toContain('Back or Escape ownership');
});

test('creator navigation restores keyboard focus to the newly opened page', async () => {
  const source = await readFile(shellSourcePath, 'utf8');

  expect(source).toContain('const mainContentRef = useRef<HTMLElement>(null);');
  expect(source).toContain('mainContentRef.current?.focus({ preventScroll: true });');
  expect(source).toContain('ref={mainContentRef}');
  expect(source).toContain('tabIndex={-1}');
});
