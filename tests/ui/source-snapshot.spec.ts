import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from '@playwright/test';

test('capture exact branch source for implementation', async () => {
  const destination = resolve('test-results/playwright/source-snapshot');
  mkdirSync(destination, { recursive: true });

  for (const path of [
    'apps',
    'packages',
    'tests',
    'docs',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'playwright.config.ts',
  ]) {
    cpSync(resolve(path), resolve(destination, path), {
      recursive: true,
      filter(source) {
        return !source.includes('/node_modules/') && !source.includes('/test-results/');
      },
    });
  }
});
