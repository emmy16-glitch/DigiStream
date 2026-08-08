import type { Organisation } from '@digistream/contracts';

export type CreatorWorkspacePreferenceStorage = Pick<
  Storage,
  'getItem' | 'removeItem' | 'setItem'
>;

function preferenceKey(userId: string): string {
  return `digistream.creator.workspace.${userId}`;
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestOrganisation(
  organisations: readonly Organisation[],
): Organisation | null {
  return (
    [...organisations].sort((left, right) => {
      const updatedDifference = timestamp(right.updatedAt) - timestamp(left.updatedAt);
      if (updatedDifference !== 0) return updatedDifference;

      const createdDifference = timestamp(right.createdAt) - timestamp(left.createdAt);
      if (createdDifference !== 0) return createdDifference;

      return left.id.localeCompare(right.id);
    })[0] ?? null
  );
}

export function resolveCreatorWorkspaceOrganisation(
  organisations: readonly Organisation[],
  preferredOrganisationId: string | null,
): Organisation | null {
  if (organisations.length === 0) return null;

  if (preferredOrganisationId) {
    const preferred = organisations.find(
      (organisation) => organisation.id === preferredOrganisationId,
    );
    if (preferred) return preferred;
  }

  const personalWorkspace = organisations.find(
    (organisation) => organisation.isPersonalWorkspace,
  );
  if (personalWorkspace) return personalWorkspace;

  return newestOrganisation(organisations);
}

export function readCreatorWorkspacePreference(
  storage: CreatorWorkspacePreferenceStorage,
  userId: string,
): string | null {
  try {
    const value = storage.getItem(preferenceKey(userId));
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function writeCreatorWorkspacePreference(
  storage: CreatorWorkspacePreferenceStorage,
  userId: string,
  organisationId: string | null,
): void {
  try {
    if (organisationId) {
      storage.setItem(preferenceKey(userId), organisationId);
    } else {
      storage.removeItem(preferenceKey(userId));
    }
  } catch {
    // Workspace selection remains API-derived when browser storage is unavailable.
  }
}
