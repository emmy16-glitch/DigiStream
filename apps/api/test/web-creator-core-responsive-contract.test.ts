import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const creatorShellPath = new URL('../../web/src/design-system/creator-shell.css', import.meta.url);
const studioAuditPath = new URL(
  '../../web/src/features/broadcasting/creator-broadcast-studio-responsive-audit.css',
  import.meta.url,
);
const mainPath = new URL('../../web/src/main.tsx', import.meta.url);

test('creator core interaction owners preserve the 44px floor', async () => {
  const [creatorShellCss, studioAuditCss, mainSource] = await Promise.all([
    readFile(creatorShellPath, 'utf8'),
    readFile(studioAuditPath, 'utf8'),
    readFile(mainPath, 'utf8'),
  ]);

  assert.match(
    creatorShellCss,
    /\.ds-shell-brand-link\s*\{[^}]*min-height:\s*44px;[^}]*display:\s*inline-flex;/s,
  );
  assert.match(
    creatorShellCss,
    /\.ds-workspace-select\s*\{[^}]*min-height:\s*44px;/s,
  );
  assert.match(
    studioAuditCss,
    /\.studio-global-alert summary,\s*\.studio-inline-alert summary\s*\{\s*min-height:\s*44px;/s,
  );
  assert.match(
    mainSource,
    /creator-broadcast-studio-responsive-audit\.css/,
  );
});
