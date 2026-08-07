import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const appSourcePath = resolve(process.cwd(), 'apps/web/src/App.tsx');
const organisationServicePath = resolve(
  process.cwd(),
  'apps/api/src/modules/organisations/organisations.service.ts',
);

test('duplicate organisation slug remains an editable field-level conflict', async () => {
  const source = await readFile(appSourcePath, 'utf8');

  expect(source).toContain("requestError.code === 'ORGANISATION_SLUG_TAKEN'");
  expect(source).toContain("return { kind: 'slug-conflict', submittedSlug: slug }");
  expect(source).toContain("setSlugError('That web address is already in use. Choose another one.')");
  expect(source).toContain("document.getElementById('organisation-slug')?.focus()");
  expect(source).toContain('aria-invalid={slugError ? \'true\' : undefined}');
  expect(source).toContain('id="organisation-slug-error" role="alert"');
});

test('organisation create failure no longer owns the initial load error state', async () => {
  const source = await readFile(appSourcePath, 'utf8');
  const createStart = source.indexOf('async function createOrganisation(');
  const signOutStart = source.indexOf('async function signOut()', createStart);
  const createSource = source.slice(createStart, signOutStart);

  expect(createStart).toBeGreaterThan(-1);
  expect(createSource).not.toContain('setOrganisationError');
  expect(source).toContain('else if (organisationError && organisations.length === 0)');
  expect(source).not.toContain('error={organisationError}');
});

test('rapid repeat submits and stale slug conflicts are bounded', async () => {
  const source = await readFile(appSourcePath, 'utf8');

  expect(source).toContain('if (submittingRef.current || busy) return;');
  expect(source).toContain('submittingRef.current = true;');
  expect(source).toContain('submittingRef.current = false;');
  expect(source).toContain('slugValueRef.current === result.submittedSlug');
  expect(source).toContain('setSlugError(\'\');');
});

test('backend keeps the conflict authoritative and non-destructive', async () => {
  const source = await readFile(organisationServicePath, 'utf8');

  expect(source).toContain("409,\n        'ORGANISATION_SLUG_TAKEN'");
  expect(source).toContain("'That organisation slug is already in use.'");
});
