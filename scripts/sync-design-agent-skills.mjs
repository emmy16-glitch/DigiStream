import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(root, '.agents', 'sources.lock.json');
const vendorRoot = join(root, '.agents', 'vendor');
const lock = JSON.parse(await readFile(lockPath, 'utf8'));

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
  }
}

await rm(vendorRoot, { recursive: true, force: true });
await mkdir(vendorRoot, { recursive: true });

for (const source of lock.sources) {
  const temp = await mkdtemp(join(tmpdir(), `digistream-skill-${source.id}-`));
  const destination = join(vendorRoot, source.id);
  try {
    run('git', ['init', '--quiet', temp]);
    run('git', ['-C', temp, 'remote', 'add', 'origin', `https://github.com/${source.repo}.git`]);
    run('git', ['-C', temp, 'fetch', '--quiet', '--depth=1', '--filter=blob:none', 'origin', source.commit]);
    run('git', ['-C', temp, 'checkout', '--quiet', '--detach', 'FETCH_HEAD']);

    for (const sourcePath of source.paths) {
      const from = join(temp, sourcePath);
      const to = join(destination, sourcePath);
      await mkdir(dirname(to), { recursive: true });
      await cp(from, to, { recursive: true });
    }

    await writeFile(
      join(destination, '.source.json'),
      `${JSON.stringify({ repo: source.repo, commit: source.commit, paths: source.paths }, null, 2)}\n`,
      'utf8',
    );
    console.log(`Synced ${source.id} @ ${source.commit.slice(0, 12)}`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

console.log(`Design-agent skills materialized in ${vendorRoot}`);
