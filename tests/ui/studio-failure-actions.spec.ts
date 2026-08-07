import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const studioPath = path.join(
  process.cwd(),
  'apps/web/src/features/broadcasting/CreatorBroadcastStudio.tsx',
);
const diagnosticsPath = path.join(
  process.cwd(),
  'apps/web/src/features/broadcasting/studio-diagnostics.ts',
);

test('Studio keeps provider references behind secondary diagnostics', async () => {
  const source = await readFile(studioPath, 'utf8');

  expect(source).toContain('<summary>Diagnostics</summary>');
  expect(source).toContain('failure.code');
  expect(source).toContain('failure.status');
  expect(source).toContain('failure.requestId');
  expect(source).not.toContain(
    'Provider details remain in diagnostics; this surface uses plain-language stages.',
  );
});

test('Studio failure alert owns bounded retry and safe return actions', async () => {
  const source = await readFile(studioPath, 'utf8');

  expect(source).toContain('function retryStudioFailure(): void');
  expect(source).toContain('Try again');
  expect(source).toContain('Return to broadcasts');
  expect(source).toContain('{failure && !liveCritical ? (');
  expect(source).toContain('onClick={requestClose}');
  expect(source).toContain("failureStage === 'studio-connect'");
  expect(source).toContain('void joinStudio()');
  expect(source).toContain("failureStage === 'delivery-start'");
  expect(source).toContain('void retryPublicDelivery()');
});

test('public delivery failure preserves an already healthy private Studio', async () => {
  const source = await readFile(studioPath, 'utf8');
  const start = source.indexOf('function handlePublicDeliveryFailure');
  const end = source.indexOf('async function pollPublicDelivery', start);
  const block = source.slice(start, end);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  expect(block).toContain("setPhase('connected')");
  expect(block).toContain('Private Studio audio remains connected');
  expect(block).not.toContain('stopLocalMedia');
});

test('private Studio outage copy states that the broadcast has not started without infrastructure administration', async () => {
  const source = await readFile(diagnosticsPath, 'utf8');

  expect(source).toContain("title: 'Private Studio is unavailable'");
  expect(source).toContain(
    "message: 'The private Studio could not connect. Your broadcast has not started.'",
  );
  expect(source).toContain('Return to Broadcasts if it remains unavailable.');
  expect(source).not.toContain('verify LiveKit health');
  expect(source).not.toContain('restart LiveKit');
});
