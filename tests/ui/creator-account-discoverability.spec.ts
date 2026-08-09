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

test('mobile creator layout moves account actions behind one labelled touch-sized affordance', async () => {
  const [styles, app, shell] = await Promise.all([
    readFile(shellStylesPath, 'utf8'),
    readFile(appSourcePath, 'utf8'),
    readFile(shellSourcePath, 'utf8'),
  ]);

  expect(styles).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.ds-creator-account-summary,[\s\S]*?\.ds-creator-account-area > \.ds-topbar-actions \{ display: none; \}/);
  expect(styles).toMatch(/\.ds-mobile-account-menu > summary \{[\s\S]*?width: 44px; height: 44px;/);
  expect(styles).toMatch(/\.ds-mobile-account-actions \.ds-button \{ width: 100%; justify-content: flex-start; \}/);
  expect(shell).toContain('aria-label="Open account and workspace menu"');
  expect(shell).toContain('className="ds-mobile-account-actions"');
  expect(app).toContain('aria-label={`Sign out ${user.displayName}`}');
  expect(app).toContain('>\n        Sign out\n      </Button>');
});

test('very narrow creator layouts keep the account popover bounded instead of restoring header clutter', async () => {
  const styles = await readFile(shellStylesPath, 'utf8');

  expect(styles).toMatch(/\.ds-mobile-account-popover \{[\s\S]*?width: min\(20rem, calc\(100vw - 28px\)\);/);
  expect(styles).toMatch(/\.ds-mobile-account-popover span \{[\s\S]*?overflow-wrap: anywhere;/);
  expect(styles).not.toMatch(/@media \(max-width: 380px\)[\s\S]*?\.ds-creator-account-area \{[\s\S]*?flex-direction: column;/);
});

test('account actions retain visible keyboard focus', async () => {
  const [base, fixes, styles] = await Promise.all([
    readFile(baseStylesPath, 'utf8'),
    readFile(manualFixesPath, 'utf8'),
    readFile(shellStylesPath, 'utf8'),
  ]);

  expect(base).toContain(':where(a, button, input, select, textarea, [tabindex]):focus-visible');
  expect(base).toContain('outline: 2px solid var(--ds-focus-ring);');
  expect(fixes).toContain('.ds-creator-account-area:focus-within');
  expect(styles).toContain('.ds-mobile-account-menu > summary:focus-visible');
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
