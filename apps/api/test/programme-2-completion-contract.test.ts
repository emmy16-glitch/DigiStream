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
    listenerLibrary,
    notifications,
    analytics,
    governance,
    auditLog,
    reportQueue,
    categories,
    administration,
    playbackTelemetry,
  ] = await Promise.all([
    read('../src/modules/broadcasts/listener-library.routes.ts'),
    read('../src/modules/notifications/notifications.routes.ts'),
    read('../src/modules/organisations/organisation-analytics.service.ts'),
    read('../src/modules/organisations/organisation-governance-report.service.ts'),
    read('../src/modules/organisations/organisation-audit-log.service.ts'),
    read('../src/modules/chat/broadcast-chat-report-queue.service.ts'),
    read('../src/modules/channels/channel-categories.service.ts'),
    read('../src/modules/administration/platform-administration.routes.ts'),
    read('../src/modules/broadcasts/playback-telemetry.repository.ts'),
  ]);

  assert.match(listenerLibrary, /saved/i);
  assert.match(listenerLibrary, /history/i);
  assert.match(notifications, /preference/i);
  assert.match(analytics, /measuredSessions/);
  assert.match(governance, /report/i);
  assert.match(auditLog, /audit/i);
  assert.match(reportQueue, /report/i);
  assert.match(categories, /categor/i);
  assert.match(administration, /suspend|reactivate/i);
  assert.match(playbackTelemetry, /heartbeat|playback/i);
});

test('Programme 2 keeps truthful Phase 9 recovery and platform administration wired at the application root', async () => {
  const [main, analytics, adminUsers] = await Promise.all([
    read('main.tsx', webRoot.href),
    read('../src/modules/organisations/organisation-analytics.service.ts'),
    read('features/admin/PlatformAdminUsersPage.tsx', webRoot.href),
  ]);

  assert.match(main, /<ConnectivityStatus\s*\/>/);
  assert.match(main, /<ApplicationErrorBoundary>/);
  assert.match(main, /route\.path === '\/admin'/);
  assert.match(main, /<PlatformAdminApplication\s*\/>/);
  assert.match(analytics, /anonymousListenerReach: 'not_collected'/);
  assert.match(analytics, /Bitrate, jitter and packet loss are not inferred/);
  assert.match(adminUsers, /sessionLoginPath\('session-expired'/);
  assert.match(adminUsers, /You are still signed in on this device/);
});

test('Programme 2 keeps executable cross-product responsive, accessibility, offline and recovery coverage', async () => {
  const requiredSpecs = [
    'entry-responsive-matrix.spec.ts',
    'onboarding-responsive-matrix.spec.ts',
    'creator-core-responsive-matrix.spec.ts',
    'creator-secondary-responsive-matrix.spec.ts',
    'listener-responsive-matrix.spec.ts',
    'guest-system-responsive-matrix.spec.ts',
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

test('Programme 2 keeps the Phase 9 integration suites in the required API test run', async () => {
  const requiredSuites = [
    'listener-library.integration.test.ts',
    'durable-notifications.integration.test.ts',
    'organisation-analytics.integration.test.ts',
    'organisation-governance-report.integration.test.ts',
    'organisation-audit-log.integration.test.ts',
    'broadcast-chat-report-queue.integration.test.ts',
    'channel-categories.integration.test.ts',
    'platform-administration.integration.test.ts',
    'playback-telemetry.integration.test.ts',
    'web-phase9-flow-resilience-contract.test.ts',
  ];

  for (const suite of requiredSuites) {
    const source = await read(suite);
    assert.ok(source.length > 0, `${suite} must remain part of the complete API test suite`);
  }
});
