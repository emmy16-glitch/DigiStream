import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const communicationAuditPath = new URL(
  '../../web/src/features/chat/communication-responsive-audit.css',
  import.meta.url,
);
const recordingsPath = new URL(
  '../../web/src/features/recordings/creator-recordings-page.css',
  import.meta.url,
);
const studioLobbyPath = new URL(
  '../../web/src/features/guests/echoo-backstage.css',
  import.meta.url,
);
const mainPath = new URL('../../web/src/main.tsx', import.meta.url);

test('creator communication controls preserve the 44px interaction floor', async () => {
  const [communicationAuditCss, recordingsCss, studioLobbyCss, mainSource] = await Promise.all([
    readFile(communicationAuditPath, 'utf8'),
    readFile(recordingsPath, 'utf8'),
    readFile(studioLobbyPath, 'utf8'),
    readFile(mainPath, 'utf8'),
  ]);

  assert.match(
    communicationAuditCss,
    /\.creator-chat-workspace \.broadcast-chat-older\s*\{[^}]*min-height:\s*44px;/s,
  );
  assert.match(mainSource, /communication-responsive-audit\.css/);

  assert.match(
    recordingsCss,
    /\.recording-more-menu summary\s*\{[^}]*width:\s*2\.75rem;[^}]*height:\s*2\.75rem;/s,
  );
  assert.match(
    studioLobbyCss,
    /\.backstage-refresh,\s*\.backstage-row-actions button,\s*\.backstage-invite-form button,\s*\.backstage-login button\s*\{[^}]*min-height:\s*44px;/s,
  );
  assert.match(
    studioLobbyCss,
    /\.backstage-selection select\s*\{[^}]*min-height:\s*46px;/s,
  );
});
