import { access, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const agentsRoot = join(root, '.agents');
const lock = JSON.parse(await readFile(join(agentsRoot, 'sources.lock.json'), 'utf8'));
const expectedSources = new Set(['ui-ux-pro-max', 'taste-skill', 'impeccable', 'emil-kowalski-skills']);
const expectedAdapters = ['ui-ux-pro-max', 'taste-skill', 'impeccable', 'emil-design-eng'];

function fail(message) {
  console.error(`design-agent skill verification failed: ${message}`);
  process.exitCode = 1;
}

if (lock.version !== 1 || !Array.isArray(lock.sources)) {
  fail('sources.lock.json must use version 1 and contain a sources array');
} else {
  const seen = new Set();
  for (const source of lock.sources) {
    if (!expectedSources.has(source.id)) fail(`unexpected source id ${source.id}`);
    if (seen.has(source.id)) fail(`duplicate source id ${source.id}`);
    seen.add(source.id);
    if (!/^[0-9a-f]{40}$/.test(source.commit ?? '')) fail(`${source.id} is not pinned to a full commit SHA`);
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repo ?? '')) fail(`${source.id} has an invalid repository name`);
    if (!Array.isArray(source.paths) || source.paths.length === 0) fail(`${source.id} has no declared source paths`);
  }
  for (const id of expectedSources) if (!seen.has(id)) fail(`missing source ${id}`);
}

for (const adapter of expectedAdapters) {
  const path = join(agentsRoot, 'skills', adapter, 'SKILL.md');
  try {
    const content = await readFile(path, 'utf8');
    if (!content.includes('AGENTS.md')) fail(`${adapter} does not declare DigiStream precedence`);
    if (!content.includes('skills:sync')) fail(`${adapter} does not point to pinned upstream materialization`);
  } catch {
    fail(`missing adapter ${adapter}`);
  }
}

const vendorRoot = join(agentsRoot, 'vendor');
try {
  if ((await stat(vendorRoot)).isDirectory()) {
    for (const source of lock.sources) {
      const markerPath = join(vendorRoot, source.id, '.source.json');
      try {
        const marker = JSON.parse(await readFile(markerPath, 'utf8'));
        if (marker.repo !== source.repo || marker.commit !== source.commit) fail(`${source.id} vendor marker does not match the lock`);
        for (const sourcePath of source.paths) await access(join(vendorRoot, source.id, sourcePath));
      } catch {
        fail(`${source.id} vendor materialization is incomplete or stale; run npm run skills:sync`);
      }
    }
  }
} catch {
  // Vendor materialization is optional in source control and intentionally gitignored.
}

if (!process.exitCode) console.log('Design-agent skill registry verified.');
