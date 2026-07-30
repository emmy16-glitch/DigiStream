import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type DigiStreamDatabase = NodePgDatabase<typeof schema>;

export type DatabaseContext = {
  pool: Pool;
  db: DigiStreamDatabase;
  check: () => Promise<number>;
  close: () => Promise<void>;
};

export function createDatabase(
  databaseUrl = process.env.DATABASE_URL,
): DatabaseContext | null {
  if (!databaseUrl) {
    return null;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: process.env.NODE_ENV === 'test',
  });

  const db = drizzle({ client: pool, schema });

  return {
    pool,
    db,
    async check(): Promise<number> {
      const startedAt = performance.now();
      await pool.query('select 1 as database_check');
      return Math.round(performance.now() - startedAt);
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
