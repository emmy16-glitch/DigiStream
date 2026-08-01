import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { ServiceHealth } from '@digistream/contracts';
import { registerAuthRoutes } from './auth/routes.js';
import {
  createDatabase,
  type DatabaseContext,
} from './db/client.js';
import { registerHttpErrorHandling } from './http/errors.js';
import { registerBroadcastGuestRoutes } from './modules/broadcast-guests/broadcast-guests.routes.js';
import { registerBroadcastContributionRoutes } from './modules/broadcasts/broadcast-contribution.routes.js';
import { registerBroadcastDeliveryRoutes } from './modules/broadcasts/broadcast-delivery.routes.js';
import { registerBroadcastRoutes } from './modules/broadcasts/broadcasts.routes.js';
import { registerChannelRoutes } from './modules/channels/channels.routes.js';
import { registerBroadcastChatRoutes } from './modules/chat/broadcast-chat.routes.js';
import {
  createLiveKitBackstageProviderFromEnv,
  type BackstageProvider,
} from './modules/media/backstage-provider.js';
import type { ContributionProvider } from './modules/media/contribution-provider.js';
import type { DeliveryProvider } from './modules/media/delivery-provider.js';
import { createLiveKitEgressProviderFromEnv } from './modules/media/livekit-egress-provider.js';
import type { MediaRelayProvider } from './modules/media/media-relay-provider.js';
import { createLiveKitContributionProviderFromEnv } from './modules/media/livekit-provider.js';
import { createOvenMediaEngineDeliveryProviderFromEnv } from './modules/media/ovenmediaengine-provider.js';
import { registerOrganisationMembershipRoutes } from './modules/organisations/organisation-memberships.routes.js';
import { registerOrganisationRoutes } from './modules/organisations/organisations.routes.js';
import { registerProfileRoutes } from './modules/profiles/profiles.routes.js';
import {
  createRecordingAccessManagerFromEnv,
  type RecordingAccessManager,
} from './modules/recordings/recording-access.js';
import { registerPublicReplayRoutes } from './modules/recordings/public-replays.routes.js';
import { registerRecordingJobRoutes } from './modules/recordings/recording-jobs.routes.js';
import { registerRecordingOrphanRoutes } from './modules/recordings/recording-orphans.routes.js';
import { registerRecordingRetentionRoutes } from './modules/recordings/recording-retention.routes.js';
import { registerRecordingRoutes } from './modules/recordings/recordings.routes.js';
import {
  registerRealtimeServer,
  type RealtimeServerOptions,
} from './modules/realtime/realtime.server.js';
import {
  createS3ObjectStorageFromEnv,
  type ObjectStorage,
} from './modules/storage/object-storage.js';

export type BuildAppOptions = {
  database?: DatabaseContext | null;
  mediaControlSecret?: string;
  contributionProvider?: ContributionProvider | null;
  backstageProvider?: BackstageProvider | null;
  deliveryProvider?: DeliveryProvider | null;
  mediaRelayProvider?: MediaRelayProvider | null;
  objectStorage?: ObjectStorage | null;
  recordingAccessManager?: RecordingAccessManager | null;
  recordingUploadMaxBytes?: number;
  realtime?: RealtimeServerOptions | false;
};

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  registerHttpErrorHandling(app);

  const database =
    options.database === undefined ? createDatabase() : options.database;
  const ownsDatabase = options.database === undefined && database !== null;
  const contributionProvider =
    options.contributionProvider === undefined
      ? createLiveKitContributionProviderFromEnv()
      : options.contributionProvider;
  const backstageProvider =
    options.backstageProvider === undefined
      ? createLiveKitBackstageProviderFromEnv()
      : options.backstageProvider;
  const deliveryProvider =
    options.deliveryProvider === undefined
      ? createOvenMediaEngineDeliveryProviderFromEnv()
      : options.deliveryProvider;
  const mediaRelayProvider =
    options.mediaRelayProvider === undefined
      ? createLiveKitEgressProviderFromEnv()
      : options.mediaRelayProvider;
  const objectStorage =
    options.objectStorage === undefined
      ? createS3ObjectStorageFromEnv()
      : options.objectStorage;
  const recordingAccessManager =
    options.recordingAccessManager === undefined
      ? createRecordingAccessManagerFromEnv()
      : options.recordingAccessManager;
  const mediaControlSecret =
    options.mediaControlSecret ?? process.env.MEDIA_CONTROL_SECRET;
  const recordingUploadMaxBytes = Math.min(
    1_073_741_824,
    positiveInteger(
      options.recordingUploadMaxBytes ?? process.env.OBJECT_STORAGE_MAX_UPLOAD_BYTES,
      268_435_456,
    ),
  );

  void app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? true,
    credentials: true,
  });

  if (ownsDatabase) {
    app.addHook('onClose', async () => {
      await database?.close();
    });
  }
  if (objectStorage) {
    app.addHook('onClose', async () => {
      await objectStorage.close();
    });
  }

  registerAuthRoutes(app, database);
  registerProfileRoutes(app, database);
  registerOrganisationRoutes(app, database);
  registerOrganisationMembershipRoutes(app, database);
  registerChannelRoutes(app, database);
  registerRecordingRoutes(app, database, mediaControlSecret, {
    objectStorage,
    accessManager: recordingAccessManager,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerPublicReplayRoutes(app, database, {
    objectStorage,
    accessManager: recordingAccessManager,
  });
  registerRecordingJobRoutes(app, database, mediaControlSecret, {
    objectStorage,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerRecordingRetentionRoutes(app, database, mediaControlSecret, {
    objectStorage,
  });
  registerRecordingOrphanRoutes(app, database, mediaControlSecret, {
    objectStorage,
  });
  registerBroadcastRoutes(
    app,
    database,
    mediaControlSecret,
  );
  registerBroadcastContributionRoutes(app, database, contributionProvider);
  registerBroadcastGuestRoutes(
    app,
    database,
    contributionProvider,
    backstageProvider,
  );
  registerBroadcastDeliveryRoutes(
    app,
    database,
    deliveryProvider,
    mediaRelayProvider,
  );
  const realtimeHub =
    options.realtime === false
      ? null
      : registerRealtimeServer(app, database, options.realtime ?? {});
  registerBroadcastChatRoutes(app, database, realtimeHub);

  app.get<{ Reply: ServiceHealth }>('/health', async (_request, reply) => {
    if (!database) {
      return {
        status: 'ok',
        service: 'digistream-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'not-configured',
        },
      };
    }

    try {
      const latencyMs = await database.check();

      return {
        status: 'ok',
        service: 'digistream-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'connected',
          latencyMs,
        },
      };
    } catch {
      return reply.code(503).send({
        status: 'degraded',
        service: 'digistream-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        database: {
          status: 'unavailable',
        },
      });
    }
  });

  app.get('/api/v1/status', async () => ({
    product: 'DigiStream',
    stage: 'recording-orphan-reconciliation',
    responsiveTargets: ['mobile', 'tablet', 'desktop'],
    capabilities: [
      'recording-object-storage',
      'recording-object-inventory',
      'recording-orphan-detection',
      'recording-orphan-quarantine',
      'recording-orphan-cleanup',
      'recording-orphan-race-restoration',
      'database-backed-recording-job-queue',
      'exclusive-recording-worker-leases',
      'recording-job-heartbeats',
      'recording-retry-backoff',
      'recording-job-reconciliation',
      'recording-retention-controls',
      'recording-legal-and-moderation-holds',
      'recording-protected-deletion-scheduling',
      'recording-cleanup-reconciliation',
      'verified-recording-artifact-upload',
      'recording-checksum-verification',
      'short-lived-recording-access',
      'recording-http-range-delivery',
      'independent-playback-download-authorization',
      'public-replay-discovery',
      'public-and-unlisted-replay-listening',
      'private-member-replay-metadata',
      'durable-live-chat',
      'chat-client-idempotency',
      'cursor-paginated-chat-history',
      'chat-reconnect-history-recovery',
      'chat-broadcast-room-delivery',
      'session-authenticated-websocket',
      'server-authorized-realtime-rooms',
      'realtime-heartbeats-and-dead-connection-cleanup',
      'realtime-reconnect-authentication',
      'realtime-multi-tab-connections',
      'creator-dashboard',
      'creator-livekit-browser-client',
      'microphone-permission-and-device-selection',
      'live-audio-level-and-clipping-feedback',
      'verified-browser-contribution-readiness',
      'creator-mute-and-reconnect-controls',
      'creator-go-live-and-end-controls',
      'listener-experience',
      'public-listener-discovery',
      'public-and-unlisted-listener-pages',
      'private-member-listener-pages',
      'webrtc-first-listener-playback',
      'automatic-llhls-fallback',
      'listener-volume-and-mute-controls',
      'listener-buffering-and-reconnect-controls',
      'short-lived-playback-access',
      'single-use-guest-invitations',
      'guest-admission-control',
      'guest-session-expiry',
      'external-guest-browser-waiting-room',
      'guest-microphone-device-and-level-controls',
      'guest-livekit-browser-contribution',
      'creator-backstage-web-workspace',
      'creator-guest-link-management',
      'creator-call-in-management',
      'livekit-backstage-participant-list',
      'livekit-guest-mute-and-remove',
      'public-call-in-requests',
      'listener-request-to-speak-controls',
      'private-call-in-status-tokens',
      'durable-call-in-duplicate-protection',
      'call-in-rate-limiting',
      'listener-call-in-status-guidance',
      'call-in-approval-to-guest-invitation',
      'organisation-workspaces',
      'organisation-tenant-isolation',
      'organisation-owner-admin-permissions',
      'organisation-invitations',
      'organisation-member-role-management',
      'organisation-final-owner-protection',
      'channel-lifecycle',
      'channel-visibility',
      'public-channel-discovery',
      'broadcast-scheduling',
      'broadcast-lifecycle',
      'broadcast-idempotency',
      'broadcast-media-readiness-gate',
      'public-broadcast-pages',
      'livekit-room-provisioning',
      'short-lived-livekit-tokens',
      'microphone-only-contribution-permissions',
      'livekit-audio-egress',
      'persistent-media-relay-jobs',
      'ovenmediaengine-rtmp-srt-ingest',
      'signed-webrtc-playback',
      'signed-llhls-playback',
      'private-playback-authorization',
      'delivery-health-reconciliation',
      'local-media-compose',
      'container-health-checks',
      'live-media-smoke-test',
      'postgresql-data-model',
      'versioned-database-migrations',
      'cookie-session-authentication',
      'public-user-profiles',
      'platform-capability-authorization',
      'request-correlation',
      'safe-api-errors',
      'livekit-creator-path',
      'ovenmediaengine-public-delivery',
    ],
  }));

  return app;
}
