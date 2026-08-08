import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import type { Organisation } from '@digistream/contracts';
import {
  readCreatorWorkspacePreference,
  resolveCreatorWorkspaceOrganisation,
  writeCreatorWorkspacePreference,
  type CreatorWorkspacePreferenceStorage,
} from '../../web/src/features/onboarding/creator-workspace-selection.js';

const appUrl = new URL('../../web/src/App.tsx', import.meta.url);
const shellUrl = new URL('../../web/src/design-system/shells.tsx', import.meta.url);
const shellStylesUrl = new URL(
  '../../web/src/design-system/creator-shell.css',
  import.meta.url,
);

function organisation(
  id: string,
  options: {
    personal?: boolean;
    updatedAt?: string;
  } = {},
): Organisation {
  return {
    id,
    name: `Organisation ${id}`,
    slug: `organisation-${id}`,
    role: 'owner',
    isPersonalWorkspace: options.personal ?? false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: options.updatedAt ?? '2026-01-01T00:00:00.000Z',
  };
}

function memoryStorage(): CreatorWorkspacePreferenceStorage {
  const values = new Map<string, string>();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test('explicit creator workspace preference wins only while it remains authorized', () => {
  const personal = organisation('personal', { personal: true });
  const selected = organisation('selected');

  assert.equal(
    resolveCreatorWorkspaceOrganisation([personal, selected], 'selected')?.id,
    'selected',
  );
  assert.equal(
    resolveCreatorWorkspaceOrganisation([personal], 'selected')?.id,
    'personal',
  );
});

test('personal workspace is preferred independent of organisation API ordering', () => {
  const personal = organisation('personal', { personal: true });
  const other = organisation('other', {
    updatedAt: '2026-08-08T12:00:00.000Z',
  });

  for (const organisations of [
    [other, personal],
    [personal, other],
  ]) {
    assert.equal(
      resolveCreatorWorkspaceOrganisation(organisations, null)?.id,
      'personal',
    );
  }
});

test('legacy multi-organisation accounts without a personal marker use the newest authorized workspace instead of array position', () => {
  const older = organisation('older', {
    updatedAt: '2026-02-01T00:00:00.000Z',
  });
  const newer = organisation('newer', {
    updatedAt: '2026-02-02T00:00:00.000Z',
  });

  for (const organisations of [
    [older, newer],
    [newer, older],
  ]) {
    assert.equal(
      resolveCreatorWorkspaceOrganisation(organisations, null)?.id,
      'newer',
    );
  }
});

test('creator workspace preference is account-scoped and removable', () => {
  const storage = memoryStorage();

  writeCreatorWorkspacePreference(storage, 'user-a', 'organisation-a');
  writeCreatorWorkspacePreference(storage, 'user-b', 'organisation-b');

  assert.equal(
    readCreatorWorkspacePreference(storage, 'user-a'),
    'organisation-a',
  );
  assert.equal(
    readCreatorWorkspacePreference(storage, 'user-b'),
    'organisation-b',
  );

  writeCreatorWorkspacePreference(storage, 'user-a', null);
  assert.equal(readCreatorWorkspacePreference(storage, 'user-a'), null);
  assert.equal(
    readCreatorWorkspacePreference(storage, 'user-b'),
    'organisation-b',
  );
});

test('creator dashboard no longer treats organisations[0] as permanent workspace context', async () => {
  const app = await readFile(appUrl, 'utf8');

  assert.doesNotMatch(app, /organisations\[0\]/);
  assert.match(app, /resolveCreatorWorkspaceOrganisation/);
  assert.match(app, /workspaceOptions=\{organisations\}/);
  assert.match(app, /onWorkspaceChange=\{selectOrganisation\}/);
});

test('creator workspace switcher is accessible on desktop and compact layouts', async () => {
  const [shell, styles] = await Promise.all([
    readFile(shellUrl, 'utf8'),
    readFile(shellStylesUrl, 'utf8'),
  ]);

  assert.match(shell, /aria-label="Switch creator workspace"/);
  assert.match(shell, /className="ds-creator-workspace-compact"/);
  assert.match(styles, /\.ds-workspace-select/);
  assert.match(
    styles,
    /@media \(max-width: 900px\)[\s\S]*\.ds-creator-workspace-compact[\s\S]*display: grid;/,
  );
  assert.match(
    styles,
    /@media \(max-width: 640px\)[\s\S]*\.ds-workspace-select[\s\S]*min-height: 44px;/,
  );
});
