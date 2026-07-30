import 'dotenv/config';
import { createDatabase } from './client.js';
import { runMigrations } from './migrate.js';

const database = createDatabase();

if (!database) {
  throw new Error('DATABASE_URL is required to run database migrations.');
}

try {
  const applied = await runMigrations(database.pool);

  if (applied.length === 0) {
    console.log('Database schema is already up to date.');
  } else {
    for (const migration of applied) {
      console.log(`Applied ${migration.name}`);
    }
  }
} finally {
  await database.close();
}
