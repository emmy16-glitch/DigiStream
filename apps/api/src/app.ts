import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PlatformStatus, ServiceHealth } from '@digistream/contracts';
import {
  createDatabase,
  type DatabaseContext,
} from './db/client.js';

export type BuildAppOptions = {
  database?: DatabaseContext | null;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

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
    stage: 'backend-data-foundation',
    responsiveTargets: ['mobile', 'tablet', 'desktop'],
    capabilities: [
      'creator-dashboard',
      'listener-experience',
      'organisation-workspaces',
      'postgresql-data-model',
      'versioned-database-migrations',
      'live-audio-roadmap',
    ],
  }));

  return app;
}
