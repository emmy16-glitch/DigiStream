import type { FastifyInstance } from 'fastify';
import type { DatabaseContext } from '../db/client.js';
import { registerPlatformAdministrationRoutes } from '../modules/administration/platform-administration.routes.js';
import { registerAuthRoutes as registerCoreAuthRoutes } from '../modules/auth/core-auth.routes.js';

export function registerAuthRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  registerCoreAuthRoutes(app, database);
  registerPlatformAdministrationRoutes(app, database);
}
