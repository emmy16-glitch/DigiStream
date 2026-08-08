import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../../web/src/main.tsx', import.meta.url);
const appUrl = new URL('../../web/src/features/admin/PlatformAdminApplication.tsx', import.meta.url);
const pageUrl = new URL('../../web/src/features/admin/PlatformAdminUsersPage.tsx', import.meta.url);
const cssUrl = new URL('../../web/src/features/admin/platform-admin-users.css', import.meta.url);

test('platform administration UI keeps the API as the independent authority', async () => {
  const [main, application, page, css] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(appUrl, 'utf8'),
    readFile(pageUrl, 'utf8'),
    readFile(cssUrl, 'utf8'),
  ]);

  assert.match(main, /pathname === '\/admin'/);
  assert.match(main, /<PlatformAdminApplication \/>/);
  assert.match(application, /\/api\/v1\/auth\/me/);
  assert.match(application, /<AuthScreen initialMode="login"/);

  assert.match(page, /\/api\/v1\/admin\/users\?/);
  assert.match(page, /\/api\/v1\/admin\/users\/\$\{encodeURIComponent\(pendingMutation\.user\.id\)\}\/status/);
  assert.match(page, /status: pendingMutation\.status/);
  assert.match(page, /Platform administrator access required/);
  assert.match(page, /revokes all of their active sessions immediately/);
  assert.match(page, /Confirm suspension/);
  assert.match(page, /Confirm reactivation/);
  assert.match(page, /disabled=\{user\.id === actor\.id\}/);
  assert.doesNotMatch(page, /passwordHash|sessionToken|password_hash|session_token/);

  assert.match(css, /@media \(max-width:\s*720px\)/);
  assert.match(css, /min-height:\s*var\(--ds-control-min-height\)/);
});
