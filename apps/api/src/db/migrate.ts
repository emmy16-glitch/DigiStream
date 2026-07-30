import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Pool } from 'pg';

const defaultMigrationsDirectory = new URL('../../migrations/', import.meta.url);

export type AppliedMigration = {
  name: string;
  checksum: string;
};

export async function runMigrations(
  pool: Pool,
  migrationsDirectory = defaultMigrationsDirectory,
): Promise<AppliedMigration[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS digistream_schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  const applied: AppliedMigration[] = [];

  for (const name of migrationFiles) {
    const sql = await readFile(new URL(name, migrationsDirectory), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');

    const existing = await pool.query<{ checksum: string }>(
      'select checksum from digistream_schema_migrations where name = $1',
      [name],
    );

    if (existing.rowCount === 1) {
      if (existing.rows[0]?.checksum !== checksum) {
        throw new Error(
          `Migration ${name} was already applied but its checksum changed. ` +
            'Create a new migration instead of editing an applied migration.',
        );
      }

      continue;
    }

    const client = await pool.connect();

    try {
      await client.query('begin');
      await client.query(sql);
      await client.query(
        'insert into digistream_schema_migrations (name, checksum) values ($1, $2)',
        [name, checksum],
      );
      await client.query('commit');
      applied.push({ name, checksum });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  return applied;
}
