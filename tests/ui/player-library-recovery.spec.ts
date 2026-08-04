import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sourcePath = resolve(
  process.cwd(),
  'apps/web/src/features/listening/oven-player.ts',
);

test('failed player bundle initialization is not cached permanently', async () => {
  const source = await readFile(sourcePath, 'utf8');

  expect(source).toContain('if (scriptPromises.get(url) === promise) scriptPromises.delete(url);');
  expect(source).toContain('script.remove();');
  expect(source).toContain('loaded from ${url} but did not initialize');
});

test('network and initialization failures share the retryable cleanup path', async () => {
  const source = await readFile(sourcePath, 'utf8');

  expect(source).toMatch(/script\.addEventListener\('load',[\s\S]*?fail\(new Error/);
  expect(source).toMatch(/script\.addEventListener\('error',[\s\S]*?fail\(new Error/);
  expect(source.match(/scriptPromises\.delete\(url\)/g)).toHaveLength(1);
});

test('concurrent callers still share one active library request', async () => {
  const source = await readFile(sourcePath, 'utf8');

  expect(source).toContain('const existing = scriptPromises.get(url);');
  expect(source).toContain('if (existing) return existing;');
  expect(source).toContain('scriptPromises.set(url, promise);');
});
