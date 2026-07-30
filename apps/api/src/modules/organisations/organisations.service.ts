import type { DigiStreamDatabase } from '../../db/client.js';
import { ApiError } from '../../http/errors.js';
import {
  canCreateOrganisation,
  createOrganisationWithOwner,
  findOrganisationForUser,
  listOrganisationsForUser,
  updateOrganisationRecord,
} from './organisations.repository.js';
import type {
  CreateOrganisationInput,
  OrganisationDto,
  UpdateOrganisationInput,
} from './organisations.types.js';

export type CreateOrganisationBody = {
  name?: unknown;
  slug?: unknown;
};

export type UpdateOrganisationBody = {
  name?: unknown;
  slug?: unknown;
};

function normaliseName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 120 ? name : null;
}

function normaliseSlug(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const slug = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    slug.length >= 3 &&
    slug.length <= 80
    ? slug
    : null;
}

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }

    if ('code' in current && (current as { code?: unknown }).code === '23505') {
      return true;
    }

    if (!('cause' in current)) {
      return false;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
}

export async function createOrganisation(
  db: DigiStreamDatabase,
  userId: string,
  body: CreateOrganisationBody,
): Promise<OrganisationDto> {
  if (!(await canCreateOrganisation(db, userId))) {
    throw new ApiError(
      403,
      'BROADCASTER_CAPABILITY_REQUIRED',
      'Broadcaster capability is required to create an organisation.',
    );
  }

  const name = normaliseName(body.name);
  const slug = normaliseSlug(body.slug);

  if (!name || !slug) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Use a 2–120 character name and a 3–80 character lowercase slug containing letters, numbers and single hyphens.',
    );
  }

  const input: CreateOrganisationInput = { name, slug };

  try {
    return await createOrganisationWithOwner(db, userId, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'ORGANISATION_SLUG_TAKEN',
        'That organisation slug is already in use.',
      );
    }

    throw error;
  }
}

export async function listOrganisations(
  db: DigiStreamDatabase,
  userId: string,
): Promise<OrganisationDto[]> {
  return listOrganisationsForUser(db, userId);
}

export async function getOrganisation(
  db: DigiStreamDatabase,
  userId: string,
  organisationId: string,
): Promise<OrganisationDto> {
  if (!validUuid(organisationId)) {
    throw new ApiError(
      404,
      'ORGANISATION_NOT_FOUND',
      'The requested organisation was not found.',
    );
  }

  const organisation = await findOrganisationForUser(
    db,
    userId,
    organisationId,
  );

  if (!organisation) {
    throw new ApiError(
      404,
      'ORGANISATION_NOT_FOUND',
      'The requested organisation was not found.',
    );
  }

  return organisation;
}

export async function updateOrganisation(
  db: DigiStreamDatabase,
  userId: string,
  organisationId: string,
  body: UpdateOrganisationBody,
): Promise<OrganisationDto> {
  const existing = await getOrganisation(db, userId, organisationId);

  if (existing.role !== 'owner' && existing.role !== 'admin') {
    throw new ApiError(
      403,
      'ORGANISATION_MANAGEMENT_REQUIRED',
      'Owner or administrator permission is required.',
    );
  }

  const name = body.name === undefined ? undefined : normaliseName(body.name);
  const slug = body.slug === undefined ? undefined : normaliseSlug(body.slug);

  if (
    (body.name !== undefined && !name) ||
    (body.slug !== undefined && !slug) ||
    (name === undefined && slug === undefined)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Provide a valid organisation name, slug, or both.',
    );
  }

  const input: UpdateOrganisationInput = {};
  if (name !== undefined && name !== null) {
    input.name = name;
  }
  if (slug !== undefined && slug !== null) {
    input.slug = slug;
  }

  try {
    const updated = await updateOrganisationRecord(
      db,
      organisationId,
      existing.role,
      input,
    );

    if (!updated) {
      throw new ApiError(
        404,
        'ORGANISATION_NOT_FOUND',
        'The requested organisation was not found.',
      );
    }

    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(
        409,
        'ORGANISATION_SLUG_TAKEN',
        'That organisation slug is already in use.',
      );
    }

    throw error;
  }
}
