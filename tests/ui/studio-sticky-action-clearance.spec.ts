import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const cssPath = resolve(
  process.cwd(),
  'apps/web/src/features/broadcasting/creator-broadcast-studio-mobile-clearance.css',
);

const mainPath = resolve(process.cwd(), 'apps/web/src/main.tsx');

async function mountStudioClearanceFixture(page: Page, width: number, height: number) {
  const css = await readFile(cssPath, 'utf8');
  await page.setViewportSize({ width, height });
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          :root { --ds-space-4: 16px; }
          * { box-sizing: border-box; }
          ${css}
        </style>
      </head>
      <body>
        <main class="creator-studio">
          <section class="studio-workspace">
            <h3>Step 3</h3>
            <p>Prepare the private Studio before starting public delivery.</p>
            <label for="studio-input">Studio input</label>
            <input id="studio-input" />
            <div role="alert">Example validation message</div>
          </section>
          <div class="studio-primary-actions">
            <button type="button">Try again</button>
          </div>
        </main>
      </body>
    </html>
  `);
}

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

  test('applies portrait clearance in an Android-sized browser viewport', async ({ page }) => {
    await mountStudioClearanceFixture(page, 412, 915);

    const creatorStudio = page.locator('.creator-studio');
    const workspace = page.locator('.studio-workspace');
    const field = page.getByLabel('Studio input');
    const actions = page.locator('.studio-primary-actions');

    await expect(creatorStudio).toHaveCSS('scroll-padding-bottom', '112px');
    await expect(workspace).toHaveCSS('padding-bottom', '96px');
    await expect(field).toHaveCSS('scroll-margin-bottom', '112px');
    await expect(actions).toHaveCSS('bottom', '0px');
    await expect(actions).toHaveCSS('padding-bottom', '16px');
  });

  test('retains clearance at a 200 percent zoom-equivalent narrow viewport', async ({ page }) => {
    await mountStudioClearanceFixture(page, 206, 458);

    const creatorStudio = page.locator('.creator-studio');
    const field = page.getByLabel('Studio input');

    await expect(creatorStudio).toHaveCSS('scroll-padding-bottom', '112px');
    await expect(field).toHaveCSS('scroll-margin-bottom', '112px');
  });

  test('retains usable clearance in short-height landscape and loads after landscape rules', async ({ page }) => {
    const main = await readFile(mainPath, 'utf8');
    await mountStudioClearanceFixture(page, 600, 360);

    const creatorStudio = page.locator('.creator-studio');
    const workspace = page.locator('.studio-workspace');
    const field = page.getByLabel('Studio input');

    await expect(creatorStudio).toHaveCSS('scroll-padding-bottom', '28px');
    await expect(workspace).toHaveCSS('padding-bottom', '28px');
    await expect(field).toHaveCSS('scroll-margin-bottom', '28px');
    expect(main.indexOf('creator-broadcast-studio-mobile-clearance.css')).toBeGreaterThan(
      main.indexOf('creator-broadcast-studio-landscape.css'),
    );
  });
});
