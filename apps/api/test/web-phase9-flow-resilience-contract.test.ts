import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../../web/src/main.tsx', import.meta.url);
const resilienceUrl = new URL('../../web/src/design-system/phase9-flow-resilience.css', import.meta.url);

test('Phase 9 creator interaction targets keep the 44px floor and semantic error treatment', async () => {
  const [main, css] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(resilienceUrl, 'utf8'),
  ]);

  assert.match(main, /phase9-flow-resilience\.css/);
  assert.match(
    css,
    /\.broadcast-chat-older,[\s\S]*\.broadcast-chat-composer button,[\s\S]*\.broadcast-chat-login button\s*\{[^}]*min-height:\s*max\(44px,\s*var\(--ds-control-min-height\)\)/,
  );
  assert.match(
    css,
    /\.broadcast-chat-error\s*\{[^}]*color:\s*var\(--ds-danger\);[^}]*background:\s*var\(--ds-danger-soft\);/s,
  );
  assert.match(
    css,
    /\.creator-chat-selection select,[\s\S]*\.recording-more-menu summary,[\s\S]*\.recording-more-actions button\s*\{[^}]*min-height:\s*max\(44px,\s*var\(--ds-control-min-height\)\)/,
  );
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
