import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PlatformStatus, ServiceHealth } from '@digistream/contracts';
import { registerAuthRoutes } from './auth/routes.js';
import {
  createDatabase,
  type DatabaseContext,
} from './db/client.js';
import { registerHttpErrorHandling } from './http/errors.js';
import { registerBroadcastRoutes } from './modules/broadcasts/broadcasts.routes.js';
import { registerChannelRoutes } from './modules/channels/channels.routes.js';
import { registerOrganisationMembershipRoutes } from './modules/organisations/organisation-memberships.routes.js';
import { registerOrganisationRoutes } from './modules/organisations/organisations.routes.js';
import { registerProfileRoutes } from './modules/profiles/profiles.routes.js';

export type BuildAppOptions = {
  database?: DatabaseContext | null;
  mediaControlSecret?: string;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  registerHttpErrorHandling(app);

  const database =
    options.database === undefined ? createDatabase() : options.database;
  const ownsDatabase = options.database === undefined && database !== null;

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

  app.get<{ Reply: PlatformStatus }>('/api/v1/status', async () => ({
    product: 'DigiStream',
    stage: 'broadcast-lifecycle',
    responsiveTargets: ['mobile', 'tablet', 'desktop'],
    capabilities: [
      'creator-dashboard',
      'listener-experience',
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
