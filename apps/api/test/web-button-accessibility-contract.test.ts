import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentsCssUrl = new URL(
  '../../web/src/design-system/components.css',
  import.meta.url,
);

async function loadButtonCss(): Promise<string> {
  return readFile(componentsCssUrl, 'utf8');
}

test('shared buttons expose visible keyboard focus without relying on hover', async () => {
  const css = await loadButtonCss();

  assert.match(css, /\.ds-button:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--ds-info\)/s);
  assert.match(css, /\.ds-icon-button:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--ds-info\)/s);
  assert.match(css, /outline-offset:\s*3px/);
});

test('shared button controls keep touch targets and explicit press feedback', async () => {
  const css = await loadButtonCss();

  assert.match(css, /@media \(pointer: coarse\)[\s\S]*\.ds-button\s*\{\s*min-height:\s*max\(44px,/);
  assert.match(css, /\.ds-icon-button\s*\{[\s\S]*width:\s*max\(44px,[\s\S]*height:\s*max\(44px,/);
  assert.match(css, /\.ds-button:active[^}]*scale\(\.98\)/);
  assert.match(css, /\.ds-icon-button:active[^}]*scale\(\.96\)/);
});

test('disabled, busy and reduced-motion button states remain distinct', async () => {
  const css = await loadButtonCss();

  assert.match(css, /\.ds-button:disabled,[\s\S]*cursor:\s*not-allowed/);
  assert.match(css, /\.ds-button\[aria-busy='true'\][\s\S]*cursor:\s*wait/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transform:\s*none/);
});
