import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentsUrl = new URL(
  '../../web/src/design-system/components.tsx',
  import.meta.url,
);
const creatorShellCssUrl = new URL(
  '../../web/src/design-system/creator-shell.css',
  import.meta.url,
);
const shellsUrl = new URL(
  '../../web/src/design-system/shells.tsx',
  import.meta.url,
);
const tokensUrl = new URL(
  '../../web/src/design-system/tokens.css',
  import.meta.url,
);

test('shared brand lockup uses the Echoo two-oval mark and wordmark', async () => {
  const [components, css, tokens] = await Promise.all([
    readFile(componentsUrl, 'utf8'),
    readFile(creatorShellCssUrl, 'utf8'),
    readFile(tokensUrl, 'utf8'),
  ]);

  assert.match(components, /ds-brand-petal-primary/);
  assert.match(components, /ds-brand-petal-secondary/);
  assert.match(components, />Echoo<\/span>/);
  assert.doesNotMatch(components, /ds-brand-wave/);

  assert.match(css, /\.ds-brand-petal-primary[^}]*background:\s*var\(--ds-accent\)/s);
  assert.match(css, /\.ds-brand-petal-secondary[^}]*background:\s*var\(--ds-brand-secondary\)/s);
  assert.match(css, /\.ds-brand-petal[^}]*border-radius:\s*999px[^}]*rotate\(-28deg\)/s);
  assert.match(tokens, /--ds-brand-secondary:\s*var\(--ds-brand\)/);
});

test('creator and listener shared shells expose Echoo branding consistently', async () => {
  const shells = await readFile(shellsUrl, 'utf8');

  assert.match(shells, /aria-label="Echoo creator home"/);
  assert.match(shells, /aria-label="Echoo listener home"/);
  assert.match(shells, /Echoo automatically selects a healthy playback path/);
  assert.match(shells, /Echoo delivers professional live audio/);
  assert.doesNotMatch(shells, /DigiStream/);
});
