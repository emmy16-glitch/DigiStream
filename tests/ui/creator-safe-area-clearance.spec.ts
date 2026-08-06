import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const cssPath = new URL('../../apps/web/src/design-system/creator-shell.css', import.meta.url);

describe('creator mobile safe-area clearance', () => {
  it('reserves dynamic viewport, top safe area and bottom navigation clearance', async () => {
    const css = await readFile(cssPath, 'utf8');

    expect(css).toContain('min-height: 100dvh');
    expect(css).toContain('--ds-creator-top-clearance: calc(112px + env(safe-area-inset-top))');
    expect(css).toContain('--ds-mobile-nav-clearance: calc(84px + env(safe-area-inset-bottom))');
    expect(css).toContain('padding: calc(12px + env(safe-area-inset-top)) 14px 12px');
    expect(css).toContain('scroll-padding-block: var(--ds-creator-top-clearance) var(--ds-mobile-nav-clearance)');
  });

  it('keeps focused fields, validation and actions clear of fixed creator chrome', async () => {
    const css = await readFile(cssPath, 'utf8');

    expect(css).toContain('[role="alert"]');
    expect(css).toContain('scroll-margin-top: calc(var(--ds-creator-top-clearance) + 12px)');
    expect(css).toContain('scroll-margin-bottom: calc(var(--ds-mobile-nav-clearance) + 12px)');
    expect(css).toContain('@media (orientation: landscape) and (max-height: 620px)');
    expect(css).toContain('--ds-creator-top-clearance: calc(88px + env(safe-area-inset-top))');
  });
});
