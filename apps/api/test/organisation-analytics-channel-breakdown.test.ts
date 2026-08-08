import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrganisationAnalytics } from '../src/modules/organisations/organisation-analytics.service.js';

test('organisation analytics exposes persisted per-channel counts and explicit measured coverage', async () => {
  const responses = [
    { rows: [{ status: 'active', count: 1 }] },
    {
      rows: [{
        id: 'channel-1',
        name: 'Measured Channel',
        slug: 'measured-channel',
        status: 'active',
        visibility: 'public',
        broadcasts: 2,
        registered_listeners: 1,
        listening_history_entries: 1,
        saved_broadcasts: 1,
      }],
    },
    { rows: [{ status: 'completed', count: 2 }] },
    { rows: [{ count: 1 }] },
    { rows: [{ count: 1 }] },
    { rows: [{ count: 1 }] },
    { rows: [{ count: 1 }] },
    {
      rows: [{
        measured_sessions: 2,
        anonymous_sessions: 1,
        signed_in_sessions: 1,
        active_sessions: 1,
        measured_listening_seconds: 45,
        buffering_events: 1,
        fallback_events: 1,
        media_errors: 0,
        sessions_with_buffering: 1,
      }],
    },
  ];
  let queryIndex = 0;
  const database = {
    pool: {
      query: async () => responses[queryIndex++] ?? { rows: [] },
    },
  } as never;

  const analytics = await getOrganisationAnalytics(database, 'org-1');

  assert.equal(analytics.channels.total, 1);
  assert.deepEqual(analytics.channels.breakdown, [{
    id: 'channel-1',
    name: 'Measured Channel',
    slug: 'measured-channel',
    status: 'active',
    visibility: 'public',
    broadcasts: 2,
    registeredListeners: 1,
    listeningHistoryEntries: 1,
    savedBroadcasts: 1,
  }]);
  assert.equal(analytics.broadcasts.total, 2);
  assert.equal(analytics.playback.measuredSessions, 2);
  assert.equal(analytics.playback.activeSessions, 1);
  assert.equal(analytics.playback.measuredListeningSeconds, 45);
  assert.equal(analytics.coverage.anonymousListenerReach, 'not_collected');
  assert.equal(analytics.coverage.concurrentAudience, 'measured_active_playback_sessions');
  assert.equal(analytics.coverage.listeningDuration, 'measured_server_heartbeat_intervals');
  assert.equal(analytics.coverage.streamQuality, 'measured_client_playback_events');
  assert.match(analytics.definitions.channelBreakdown, /do not represent anonymous reach, plays, duration or concurrency/i);
  assert.match(analytics.definitions.streamQualityEvents, /Bitrate, jitter and packet loss are not inferred/i);
});
