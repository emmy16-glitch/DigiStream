# DigiStream channel backend

Channels are the public or private identities through which organisations publish broadcasts. They remain separate from personal user profiles.

## Lifecycle

```text
draft → pending_review → active → suspended → active
                         ↘ archived
              suspended → archived
```

An archived channel is terminal. Broadcasters can create channels and edit channel content, but only organisation owners and administrators can change lifecycle status.

## Visibility

- `public`: appears in discovery and can be opened directly.
- `unlisted`: excluded from discovery but available through its exact URL.
- `private`: available only through authenticated organisation-member routes.

Only channels in `active` status can be reached through public routes.

## Organisation endpoints

```text
POST  /api/v1/organisations/:organisationId/channels
GET   /api/v1/organisations/:organisationId/channels
GET   /api/v1/organisations/:organisationId/channels/:channelId
PATCH /api/v1/organisations/:organisationId/channels/:channelId
```

Any organisation member can list and read organisation channels. Owners, administrators and broadcasters can create and edit channel content. Only owners and administrators can approve, activate, suspend or archive channels.

Cross-tenant requests return the same private not-found response as an unknown organisation.

## Public endpoints

```text
GET /api/v1/channels?q=community&category=community&organisation=my-network&limit=20&cursor=<opaque>
GET /api/v1/channels/:organisationSlug/:channelSlug
```

Public discovery returns only active public channels. `q` uses PostgreSQL full-text search across the channel name, description and category. Category and organisation-slug filters can be combined with search. Results use deterministic `created_at DESC, id DESC` ordering and an opaque `nextCursor`; clients pass that cursor back unchanged to continue without offset drift. Limits remain bounded from 1 to 50, malformed cursors are rejected, and no cursor contains authorization or private state.

Exact public detail permits active public and active unlisted channels. Private, inactive, suspended and archived channels return not found. Search and filtering never widen this visibility boundary.

## Validation and integrity

- Channel slugs are lowercase and unique inside an organisation.
- Categories are optional normalized slugs.
- Descriptions are limited to 2,000 characters.
- Search terms are normalized and bounded to 2–120 characters.
- Public list limits are bounded from 1 to 50.
- Discovery has PostgreSQL indexes for full-text lookup and stable public cursor ordering.
- PostgreSQL protects lifecycle, visibility, organisation ownership and slug uniqueness.
