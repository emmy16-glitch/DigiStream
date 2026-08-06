import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const cssPath = resolve(
  process.cwd(),
  'apps/web/src/features/broadcasting/creator-broadcast-studio-mobile-clearance.css',
);

const mainPath = resolve(process.cwd(), 'apps/web/src/main.tsx');

test.describe('Studio sticky action clearance', () => {
  test('keeps Step 3 headings, explanations and controls above sticky actions', async () => {
    const css = await readFile(cssPath, 'utf8');

    expect(css).toContain('.studio-workspace');
    expect(css).toContain('padding-bottom: calc(96px + env(safe-area-inset-bottom))');
    expect(css).toContain('scroll-margin-bottom: calc(112px + env(safe-area-inset-bottom))');
    expect(css).toContain('.studio-primary-actions');
    expect(css).toContain('bottom: env(safe-area-inset-bottom)');
    expect(css).toContain('padding-bottom: calc(var(--ds-space-4) + env(safe-area-inset-bottom))');
  });

  test('retains usable clearance in short-height landscape and loads after landscape rules', async () => {
    const [css, main] = await Promise.all([
      readFile(cssPath, 'utf8'),
      readFile(mainPath, 'utf8'),
    ]);

    expect(css).toContain('@media (orientation: landscape) and (max-height: 620px)');
    expect(css).toContain('scroll-padding-bottom: calc(28px + env(safe-area-inset-bottom))');
    expect(main.indexOf('creator-broadcast-studio-mobile-clearance.css')).toBeGreaterThan(
      main.indexOf('creator-broadcast-studio-landscape.css'),
    );
  });
});
