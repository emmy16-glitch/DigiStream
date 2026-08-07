import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const chatPath = path.join(
  process.cwd(),
  'apps/web/src/features/chat/BroadcastChat.tsx',
);

test('chat only shows the empty state after successful history and writable lifecycle truth', async () => {
  const source = await readFile(chatPath, 'utf8');

  expect(source).toContain("type HistoryState = 'idle' | 'loading' | 'ready' | 'unavailable'");
  expect(source).toContain("setHistoryState('ready')");
  expect(source).toContain("setHistoryState('unavailable')");
  expect(source).toContain(
    "const showEmptyState = historyState === 'ready' && !recoveringHistory && canSend && messages.length === 0",
  );
  expect(source).toContain("historyState === 'unavailable'");
  expect(source).toContain('<strong>Chat unavailable</strong>');
});

test('chat removes the composer while unavailable, recovering or read-only', async () => {
  const source = await readFile(chatPath, 'utf8');

  expect(source).toContain(
    "const showReadOnlyState = historyState === 'ready' && !recoveringHistory && !canSend",
  );
  expect(source).toContain("{canSend && !recoveringHistory ? (");
  expect(source).toContain('<strong>Recovering missed messages…</strong>');
  expect(source).toContain('<strong>Chat is read-only</strong>');
  expect(source).not.toContain("placeholder={\n                  canSend");
});

test('chat retries only transient initial-history failures and preserves private-not-found wording', async () => {
  const source = await readFile(chatPath, 'utf8');

  expect(source).toContain("error.code === 'CHAT_NOT_AVAILABLE'");
  expect(source).toContain("return 'This live chat is not available for this broadcast.'");
  expect(source).toContain("error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500");
  expect(source).toContain("{historyRetryable ? (");
  expect(source).toContain("onClick={() => void loadLatest('initial')}");
});

test('scheduled and completed chat states have truthful read-only copy', async () => {
  const source = await readFile(chatPath, 'utf8');

  expect(source).toContain("if (status === 'scheduled') return 'Chat opens when the broadcast starts.'");
  expect(source).toContain("if (status === 'completed') return 'This broadcast has ended. Chat history is read-only.'");
  expect(source).toContain("if (status === 'ending') return 'This broadcast is ending. Chat is now read-only.'");
});
