#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'docs/design/reference/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const screenDir = path.join(repoRoot, manifest.directory);

let actualFiles;
try {
  actualFiles = (await readdir(screenDir)).filter((name) => name.toLowerCase().endsWith('.png')).sort();
} catch {
  console.error(`Missing reference directory: ${manifest.directory}`);
  console.error('Expected the approved 50 DigiStream PNG references to be present before visual implementation.');
  process.exit(1);
}

const expectedFiles = manifest.screens.map((screen) => screen.filename).sort();
const missing = expectedFiles.filter((name) => !actualFiles.includes(name));
const unexpected = actualFiles.filter((name) => !expectedFiles.includes(name));

if (missing.length || unexpected.length) {
  if (missing.length) console.error(`Missing (${missing.length}): ${missing.join(', ')}`);
  if (unexpected.length) console.error(`Unexpected (${unexpected.length}): ${unexpected.join(', ')}`);
  process.exit(1);
}

let failed = false;
for (const screen of manifest.screens) {
  const filePath = path.join(screenDir, screen.filename);
  const bytes = await readFile(filePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== screen.sha256) {
    failed = true;
    console.error(`SHA mismatch: ${screen.filename}`);
    console.error(`  expected ${screen.sha256}`);
    console.error(`  actual   ${sha256}`);
  }
  if (bytes.length !== screen.bytes) {
    failed = true;
    console.error(`Size mismatch: ${screen.filename} expected ${screen.bytes}, got ${bytes.length}`);
  }
}

if (failed) process.exit(1);

console.log(`Verified ${manifest.screens.length} approved DigiStream design references.`);
console.log(`Directory: ${manifest.directory}`);
