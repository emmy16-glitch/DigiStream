#!/usr/bin/env node

import { mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const sourceArg = process.argv[2];
if (!sourceArg) {
  console.error('Usage: node scripts/install-design-references.mjs <directory-or-zip>');
  console.error('Example: node scripts/install-design-references.mjs ./DigiStream_Final_50_Reference_Pack.zip');
  process.exit(1);
}

const repoRoot = process.cwd();
const target = path.join(repoRoot, 'docs/design/reference/screens');
await mkdir(target, { recursive: true });

const source = path.resolve(sourceArg);
const sourceStat = await stat(source).catch(() => null);
if (!sourceStat) {
  console.error(`Source not found: ${source}`);
  process.exit(1);
}

let sourceDir = source;
let tempDir;

if (sourceStat.isFile()) {
  if (!source.toLowerCase().endsWith('.zip')) {
    console.error('Source file must be the approved reference ZIP.');
    process.exit(1);
  }
  tempDir = path.join(repoRoot, '.tmp-digistream-design-references');
  const result = spawnSync('unzip', ['-o', source, '-d', tempDir], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
  sourceDir = tempDir;
}

async function findPngs(dir) {
  const found = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) found.push(full);
    }
  }
  await walk(dir);
  return found;
}

const pngs = await findPngs(sourceDir);
const byName = new Map(pngs.map((file) => [path.basename(file), file]));
const manifest = JSON.parse(await (await import('node:fs/promises')).readFile(path.join(repoRoot, 'docs/design/reference/manifest.json'), 'utf8'));

for (const screen of manifest.screens) {
  const src = byName.get(screen.filename);
  if (!src) {
    console.error(`Approved file missing from source pack: ${screen.filename}`);
    process.exit(1);
  }
  await copyFile(src, path.join(target, screen.filename));
}

console.log(`Copied ${manifest.screens.length} approved reference images to ${path.relative(repoRoot, target)}.`);
const verify = spawnSync(process.execPath, ['scripts/verify-design-references.mjs'], { stdio: 'inherit' });
process.exit(verify.status ?? 1);
