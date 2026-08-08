import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const appPath = new URL('../../web/src/App.tsx', import.meta.url);
const mainPath = new URL('../../web/src/main.tsx', import.meta.url);
const focusManagerPath = new URL('../../web/src/features/onboarding/OnboardingStepFocusManager.tsx', import.meta.url);
const responsiveCssPath = new URL('../../web/src/features/onboarding/onboarding-responsive-audit.css', import.meta.url);

test('creator onboarding keeps truthful slug guidance and rendered-step focus ownership', async () => {
  const [appSource, mainSource, focusSource, responsiveCss] = await Promise.all([
    readFile(appPath, 'utf8'),
    readFile(mainPath, 'utf8'),
    readFile(focusManagerPath, 'utf8'),
    readFile(responsiveCssPath, 'utf8'),
  ]);

  assert.match(appSource, /Used in public Echoo links\. Lowercase letters, numbers and hyphens only\./);
  assert.doesNotMatch(appSource, /Used in public DigiStream links/);
  assert.match(appSource, /id="workspace-onboarding-title" tabIndex=\{-1\}/);
  assert.match(appSource, /document\.getElementById\('workspace-onboarding-title'\)\?\.focus\(\)/);

  assert.match(mainSource, /<OnboardingStepFocusManager \/>/);
  assert.match(mainSource, /onboarding-responsive-audit\.css/);
  assert.match(focusSource, /create-channel-title/);
  assert.match(focusSource, /create-broadcast-title/);
  assert.match(focusSource, /First broadcast choices/);
  assert.match(focusSource, /MutationObserver/);
  assert.match(responsiveCss, /#organisation-slug-help\s*\{\s*display: block;/s);
});
