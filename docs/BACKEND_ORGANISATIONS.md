# Organisation tenancy backend

DigiStream organisations are private tenant workspaces. A user may only list or read an organisation through an active membership record.

## Endpoints

- `POST /api/v1/organisations` — create an organisation and its owner membership atomically
- `GET /api/v1/organisations` — list only organisations the signed-in user belongs to
- `GET /api/v1/organisations/:organisationId` — read one organisation through membership
- `PATCH /api/v1/organisations/:organisationId` — update name or slug as an owner or admin

## Creation rule

The creator must have an active `broadcaster` or `platform_admin` capability. Organisation insertion and owner-membership insertion run in one PostgreSQL transaction, so neither record can exist without the other.

## Tenant isolation

A user outside an organisation receives `ORGANISATION_NOT_FOUND`, even when the identifier belongs to a real organisation. This avoids confirming private tenant existence through guessed IDs.

## Current role behaviour

- owner: read and update
- admin: read and update
- broadcaster: read
- moderator: read
- analyst: read

Invitation, role-change, member-removal and final-owner protection endpoints are intentionally reserved for the next membership slice.
