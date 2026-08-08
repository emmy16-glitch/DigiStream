import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appUrl = new URL('../../web/src/App.tsx', import.meta.url);
const analyticsUrl = new URL('../../web/src/features/analytics/CreatorAnalyticsPage.tsx', import.meta.url);
const analyticsCssUrl = new URL('../../web/src/features/analytics/creator-analytics.css', import.meta.url);

test('Creator Stats uses the tenant analytics API and explicit truthful states', async () => {
  const [app, analytics] = await Promise.all([
    readFile(appUrl, 'utf8'),
    readFile(analyticsUrl, 'utf8'),
  ]);

  assert.match(app, /CreatorAnalyticsPage/);
  assert.match(app, /<CreatorAnalyticsPage organisation=\{selectedOrganisation\}/);
  assert.match(
    analytics,
    /\/api\/v1\/organisations\/\$\{encodeURIComponent\(organisation\.id\)\}\/analytics/,
  );
  assert.match(analytics, /title="Loading Stats"/);
  assert.match(analytics, /title="No stored Stats yet"/);
  assert.match(analytics, /title="Stats could not load"/);
  assert.match(analytics, /status === 401/);
  assert.match(analytics, /status === 404/);
  assert.match(analytics, /title="Stats are not available"/);
  assert.match(analytics, /response\.analytics\.organisationId !== organisation\.id/);
});

test('Creator Stats displays only persisted metrics and names unavailable measurements', async () => {
  const analytics = await readFile(analyticsUrl, 'utf8');

  assert.match(analytics, /Persisted product data/);
  assert.match(analytics, /Registered listeners/);
  assert.match(analytics, /Listening-history entries/);
  assert.match(analytics, /Saved broadcasts/);
  assert.match(analytics, /Users who saved/);
  assert.match(analytics, /Channel breakdown/);
  assert.match(analytics, /Anonymous listener reach, concurrent audience, listening duration and stream quality/);
  assert.match(analytics, /does not fill empty Stats with sample data/);
  assert.doesNotMatch(analytics, /Math\.random/);
  assert.doesNotMatch(analytics, /sampleMetric|fakeMetric|estimatedReach/);
});

test('Creator Stats remains keyboard and small-screen usable', async () => {
  const [analytics, css] = await Promise.all([
    readFile(analyticsUrl, 'utf8'),
    readFile(analyticsCssUrl, 'utf8'),
  ]);

  assert.match(analytics, /tabIndex=\{0\}/);
  assert.match(analytics, /<th scope="col">/);
  assert.match(analytics, /<th scope="row">/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width:\s*640px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\)/);
});
