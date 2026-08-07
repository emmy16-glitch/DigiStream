import 'dotenv/config';
import { createDatabase } from '../db/client.js';
import {
  bootstrapFirstPlatformAdmin,
  PlatformAdminBootstrapError,
} from './bootstrap-platform-admin.js';

function emailArgument(argv: string[]): string | null {
  const index = argv.indexOf('--email');
  if (index < 0) return null;
  return argv[index + 1] ?? null;
}

async function main(): Promise<void> {
  const email = emailArgument(process.argv.slice(2));
  if (!email) {
    console.error('Usage: npm run operator:bootstrap-admin -- --email user@example.com');
    process.exitCode = 2;
    return;
  }

  const database = createDatabase();
  if (!database) {
    console.error('DATABASE_URL must be configured before running the operator bootstrap.');
    process.exitCode = 2;
    return;
  }

  try {
    const result = await bootstrapFirstPlatformAdmin(database, email);
    if (result.status === 'already-configured') {
      console.log(`Platform administrator is already configured for ${result.email}.`);
    } else {
      console.log(`Granted first platform-administrator authority to ${result.email}.`);
    }
  } catch (error) {
    if (error instanceof PlatformAdminBootstrapError) {
      console.error(`${error.code}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await database.close();
  }
}

await main();
