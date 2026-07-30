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

export type BuildAppOptions = {
  database?: DatabaseContext | null;
  mediaControlSecret?: string;
  contributionProvider?: ContributionProvider | null;
  backstageProvider?: BackstageProvider | null;
  deliveryProvider?: DeliveryProvider | null;
  mediaRelayProvider?: MediaRelayProvider | null;
};

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

  void app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? true,
    credentials: true,
  });

  if (ownsDatabase) {
    app.addHook('onClose', async () => {
      await database?.close();
    });
  }

  registerAuthRoutes(app, database);
  registerProfileRoutes(app, database);
  registerOrganisationRoutes(app, database);
  registerOrganisationMembershipRoutes(app, database);
  registerChannelRoutes(app, database);
  registerBroadcastRoutes(
    app,
    database,
    options.mediaControlSecret ?? process.env.MEDIA_CONTROL_SECRET,
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
    stage: 'guest-backstage-control',
    responsiveTargets: ['mobile', 'tablet', 'desktop'],
    capabilities: [
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
      'livekit-backstage-participant-list',
      'livekit-guest-mute-and-remove',
      'public-call-in-requests',
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
