# DigiStream channel backend

Channels are the public or private identities through which organisations publish broadcasts. They remain separate from personal user profiles.

## Lifecycle

```text
draft → pending_review → active → suspended → active
                         ↘ archived
              suspended → archived
```

An archived channel is terminal for ordinary lifecycle updates. Broadcasters can create channels and edit channel content. Owners and administrators approve and archive channels. Suspension and restoration use the dedicated moderation action so the actor, reason and audit event cannot be bypassed by the generic update endpoint.

## Visibility

- `public`: appears in discovery and can be opened directly.
- `unlisted`: excluded from discovery but available through its exact URL.
- `private`: available only through authenticated organisation-member routes.

Only channels in `active` status can be reached through public routes. Soft-deleted channels are excluded from organisation reads, exact public routes, discovery and followed-channel results immediately.

## Organisation endpoints

```text
POST   /api/v1/organisations/:organisationId/channels
GET    /api/v1/organisations/:organisationId/channels
GET    /api/v1/organisations/:organisationId/channels/:channelId
PATCH  /api/v1/organisations/:organisationId/channels/:channelId
POST   /api/v1/organisations/:organisationId/channels/:channelId/moderation
DELETE /api/v1/organisations/:organisationId/channels/:channelId
POST   /api/v1/organisations/:organisationId/channels/:channelId/restore
```

Any organisation member can list and read normal organisation channels. Owners, administrators and broadcasters can create and edit channel content. Owners and administrators approve and archive channels. Owners, administrators and moderators may suspend an active channel or restore a suspended channel through the moderation endpoint. Owners and administrators may soft-delete and restore a retained channel.

Cross-tenant requests return the same private not-found response as an unknown organisation.

## Moderation and retained deletion

Moderation requires a bounded reason between 3 and 500 characters. A suspension or restoration records the authenticated actor and reason and creates the matching organisation audit event atomically with the lifecycle write. Duplicate requests that ask for a state already reached are idempotent and do not create extra audit events or replace the original evidence.

Soft deletion changes the channel to `archived`, records `deleted_at`, and opens a 30-day recovery window in `retention_until`. Repeating a delete does not extend that deadline. During the window, an owner or administrator can restore the channel. Restoration always returns it to `draft` and clears deletion metadata so previously public content is never silently republished.

After the recovery deadline, the restore endpoint returns `CHANNEL_RETENTION_EXPIRED`. Expired rows remain unavailable to product surfaces; permanent purge and legal-hold processing require their separately governed cleanup path rather than an implicit destructive request-time cascade.

## Public endpoints

```text
GET /api/v1/channels?q=community&category=community&organisation=my-network&limit=20&cursor=<opaque>
GET /api/v1/channels/:organisationSlug/:channelSlug
```

Public discovery returns only active public, non-deleted channels. `q` uses PostgreSQL full-text search across the channel name, description and category. Category and organisation-slug filters can be combined with search. Results use deterministic `created_at DESC, id DESC` ordering and an opaque `nextCursor`; clients pass that cursor back unchanged to continue without offset drift. Limits remain bounded from 1 to 50, malformed cursors are rejected, and no cursor contains authorization or private state.

Exact public detail permits active public and active unlisted channels. Private, inactive, suspended, archived and soft-deleted channels return not found. Search and filtering never widen this visibility boundary.

## Validation and integrity

- Channel slugs are lowercase and unique inside an organisation.
- Categories are optional normalized slugs.
- Descriptions are limited to 2,000 characters.
- Search terms are normalized and bounded to 2–120 characters.
- Public list limits are bounded from 1 to 50.
- Discovery has PostgreSQL indexes for full-text lookup and stable public cursor ordering.
- Moderation and deletion writes create actor-scoped organisation audit events in the same database transaction.
- PostgreSQL protects lifecycle, visibility, organisation ownership and slug uniqueness.
