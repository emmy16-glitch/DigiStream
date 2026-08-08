import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const mainUrl = new URL('../../web/src/main.tsx', import.meta.url);
const componentsUrl = new URL('../../web/src/design-system/components.tsx', import.meta.url);
const systemStateUrl = new URL('../../web/src/design-system/EchooSystemStatePage.tsx', import.meta.url);
const systemStateCssUrl = new URL('../../web/src/design-system/echoo-system-state.css', import.meta.url);
const guestUrl = new URL('../../web/src/features/guests/GuestJoinPage.tsx', import.meta.url);
const guestCssUrl = new URL('../../web/src/features/guests/guest-join.css', import.meta.url);

test('final Echoo migration exposes the four truthful system-state references', async () => {
  const [main, components, state, css] = await Promise.all([
    readFile(mainUrl, 'utf8'),
    readFile(componentsUrl, 'utf8'),
    readFile(systemStateUrl, 'utf8'),
    readFile(systemStateCssUrl, 'utf8'),
  ]);

  assert.match(state, /'loading'/);
  assert.match(state, /'offline'/);
  assert.match(state, /'session-expired'/);
  assert.match(state, /'not-found'/);
  assert.match(state, /echoo-system-spinner/);
  assert.match(css, /background:\s*#f4f8fd/);
  assert.match(css, /@media \(max-width:\s*520px\)/);

  assert.match(components, /title === 'Opening DigiStream'/);
  assert.match(components, /title="Loading"/);
  assert.match(components, /Please wait a moment\.\.\./);
  assert.match(components, /title === 'Cannot connect to DigiStream'/);
  assert.match(components, /title="No Connection"/);
  assert.match(components, /Check your internet connection and try again\./);

  assert.match(main, /reason.*session-expired/s);
  assert.match(main, /title="Session Expired"/);
  assert.match(main, /Your session has expired\./);
  assert.match(main, /actionLabel="Log in again"/);
  assert.match(main, /title="Not Found"/);
  assert.match(main, /Broadcast not found or no longer available\./);
  assert.match(main, /actionLabel="Go back"/);
});

test('guest invitation adopts the Echoo join reference without weakening guest admission truth', async () => {
  const [source, css] = await Promise.all([
    readFile(guestUrl, 'utf8'),
    readFile(guestCssUrl, 'utf8'),
  ]);

  assert.match(source, /You’re invited to join a live conversation\./);
  assert.match(source, /Check your audio/);
  assert.match(source, /Microphone/);
  assert.match(source, /Connection/);
  assert.match(source, /Host admission/);
  assert.match(source, /Join Studio Lobby/);
  assert.match(source, /\/api\/v1\/guest-invitations\/\$\{encodeURIComponent\(route\.token\)\}\/accept/);
  assert.match(source, /\/api\/v1\/guest-contribution-token/);
  assert.match(source, /'x-guest-session-token': session\.sessionToken/);
  assert.match(source, /setInterval\(\(\) => void checkAdmission\(\), 3_000\)/);
  assert.match(source, /createLocalAudioTrack/);
  assert.match(source, /room\.connect\(credential\.url, credential\.token\)/);
  assert.match(source, /publishTrack\(track/);

  assert.doesNotMatch(source, /Morning Vibes With Sam/);
  assert.doesNotMatch(source, /Alex Morgan/);
  assert.doesNotMatch(source, />LIVE</);

  assert.match(css, /background:\s*#f4f8fd/);
  assert.match(css, /guest-audio-check/);
  assert.match(css, /guest-check-row/);
  assert.match(css, /@media \(max-width:\s*520px\)/);
});
