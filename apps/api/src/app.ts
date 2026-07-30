import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { PlatformStatus, ServiceHealth } from '@digistream/contracts';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  void app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? true,
    credentials: true,
  });

  app.get<{ Reply: ServiceHealth }>('/health', async () => ({
    status: 'ok',
    service: 'digistream-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  }));

  app.get<{ Reply: PlatformStatus }>('/api/v1/status', async () => ({
    product: 'DigiStream',
    stage: 'foundation',
    responsiveTargets: ['mobile', 'tablet', 'desktop'],
    capabilities: [
      'creator-dashboard',
      'listener-experience',
      'organisation-workspaces',
      'live-audio-roadmap',
    ],
  }));

  return app;
}
