import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readRepoFile = (path: string) =>
  readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

type Rgb = readonly [number, number, number];

function cssVariable(stylesheet: string, name: string): string {
  const match = stylesheet.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(match, `missing --${name}`);
  return match[1]!.trim();
}

function hexToRgb(value: string): Rgb {
  const match = value.match(/^#([0-9a-f]{6})$/i);
  assert.ok(match, `expected six-digit hex colour, received ${value}`);
  const hex = match[1]!;
  return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as unknown as Rgb;
}

function rgbaToCompositeOnWhite(value: string): Rgb {
  const match = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
  assert.ok(match, `expected rgba colour, received ${value}`);
  const alpha = Number(match[4]);
  const channels = [Number(match[1]), Number(match[2]), Number(match[3])];
  return channels.map((channel) => ((channel / 255) * alpha) + (1 - alpha)) as unknown as Rgb;
}

function linear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]: Rgb): number {
  return (0.2126 * linear(red)) + (0.7152 * linear(green)) + (0.0722 * linear(blue));
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

test('semantic foreground tokens meet WCAG AA on their Echoo soft surfaces', async () => {
  const tokens = await readRepoFile('apps/web/src/design-system/tokens.css');

  for (const tone of ['success', 'warning', 'danger', 'info']) {
    const foreground = hexToRgb(cssVariable(tokens, `ds-${tone}-foreground`));
    const softSurface = rgbaToCompositeOnWhite(cssVariable(tokens, `ds-${tone}-soft`));
    const ratio = contrastRatio(foreground, softSurface);
    assert.ok(ratio >= 4.5, `${tone} foreground contrast ${ratio.toFixed(2)} is below WCAG AA 4.5:1`);
  }
});

test('legacy feedback selectors are normalized after old manual-review overrides', async () => {
  const entrypoint = await readRepoFile('apps/web/src/main.tsx');
  const stylesheet = await readRepoFile(
    'apps/web/src/design-system/semantic-feedback-contrast.css',
  );

  const manualReviewIndex = entrypoint.indexOf('manual-review-fixes.css');
  const semanticContrastIndex = entrypoint.indexOf('semantic-feedback-contrast.css');
  assert.ok(manualReviewIndex >= 0, 'manual review stylesheet must remain loaded');
  assert.ok(semanticContrastIndex > manualReviewIndex, 'semantic contrast must load after legacy overrides');

  assert.match(stylesheet, /\.workspace-inline-error[\s\S]*var\(--ds-danger-foreground\)/);
  assert.match(stylesheet, /\.ds-state-error \.ds-state-icon[\s\S]*var\(--ds-danger-foreground\)/);
  assert.match(stylesheet, /\.ds-state-unauthorized \.ds-state-icon[\s\S]*var\(--ds-warning-foreground\)/);
  assert.match(stylesheet, /\.ds-state-loading \.ds-state-icon[\s\S]*var\(--ds-info-foreground\)/);
  assert.match(stylesheet, /\.broadcast-overdue-note[\s\S]*var\(--ds-warning-foreground\)/);
  assert.match(stylesheet, /forced-colors:\s*active/);
});
