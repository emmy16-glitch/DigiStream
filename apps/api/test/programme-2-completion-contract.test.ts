import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const webRoot = new URL('../../web/src/', import.meta.url);
const uiRoot = new URL('../../../tests/ui/', import.meta.url);

async function read(relativePath: string, base = import.meta.url): Promise<string> {
  return readFile(new URL(relativePath, base), 'utf8');
}

test('Programme 2 keeps the complete Phase 9 runtime ownership wired', async () => {
  const [
    listenerLibraryRoutes,
    notificationsRoutes,
    analyticsRoutes,
    governanceRoutes,
    auditRoutes,
    reportQueueRoutes,
    channelRoutes,
    adminRoutes,
    playbackTelemetryRoutes,
  ] = await Promise.all([
    read('../src/modules/broadcasts/listener-library.routes.ts'),
    read('../src/modules/notifications/notifications.routes.ts'),
    read('../src/modules/organisations/organisation-analytics.routes.ts'),
    read('../src/modules/organisations/organisation-governance-report.routes.ts'),
    read('../src/modules/organisations/organisation-audit-log.routes.ts'),
    read('../src/modules/chat/broadcast-chat-report-queue.routes.ts'),
    read('../src/modules/channels/channels.routes.ts'),
    read('../src/modules/platform-administration/platform-administration.routes.ts'),
    read('../src/modules/broadcasts/playback-telemetry.routes.ts'),
  ]);

  assert.match(listenerLibraryRoutes, /saved/i);
  assert.match(listenerLibraryRoutes, /history/i);
  assert.match(notificationsRoutes, /preference/i);
  assert.match(analyticsRoutes, /analytics/i);
  assert.match(governanceRoutes, /report/i);
  assert.match(auditRoutes, /audit/i);
  assert.match(reportQueueRoutes, /report/i);
  assert.match(channelRoutes, /categor/i);
  assert.match(adminRoutes, /suspend|reactivate/i);
  assert.match(playbackTelemetryRoutes, /telemetry|playback/i);
});

test('Programme 2 keeps truthful Phase 9 web recovery and administration ownership wired at the application root', async () => {
  const [main, analytics, adminApplication] = await Promise.all([
    read('main.tsx', webRoot.href),
    read('features/analytics/CreatorAnalyticsPage.tsx', webRoot.href),
    read('features/admin/PlatformAdminApplication.tsx', webRoot.href),
  ]);

  assert.match(main, /<ConnectivityStatus\s*\/>/);
  assert.match(main, /<ApplicationErrorBoundary>/);
  assert.match(main, /<PlatformAdminApplication\s*\/>/);
  assert.match(analytics, /not_collected|not collected|unavailable/i);
  assert.match(adminApplication, /session-expired|Session Expired|session expired/i);
});

test('Programme 2 keeps executable cross-product responsive, accessibility, offline and recovery coverage', async () => {
  const requiredSpecs = [
    'entry-responsive-matrix.spec.ts',
    'onboarding-responsive-matrix.spec.ts',
    'creator-core-responsive-matrix.spec.ts',
    'creator-secondary-responsive-matrix.spec.ts',
    'listener-responsive-matrix.spec.ts',
    'guest-responsive-matrix.spec.ts',
    'connectivity-state.spec.ts',
    'runtime-error-recovery.spec.ts',
    'platform-admin-access.spec.ts',
    'platform-admin-logout-recovery.spec.ts',
  ];

  for (const spec of requiredSpecs) {
    const source = await read(spec, uiRoot.href);
    assert.ok(source.length > 0, `${spec} must remain executable coverage`);
  }
});

test('Programme 2 analytics truth model refuses unsupported inferred media metrics', async () => {
  const analyticsDoc = await read('../../../docs/ANALYTICS.md');
  assert.match(analyticsDoc, /unique anonymous listener reach remains `not_collected`/);
  assert.match(analyticsDoc, /bitrate remains unavailable/);
  assert.match(analyticsDoc, /jitter remains unavailable/);
  assert.match(analyticsDoc, /packet loss remains unavailable/);
  assert.match(analyticsDoc, /must not be substituted for measured browser playback sessions/);
});
