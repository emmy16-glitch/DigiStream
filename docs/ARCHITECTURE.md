# DigiStream architecture

## Goal

Build one responsive, production-oriented audio-streaming platform that remains convenient to develop from Termux and Codespaces while supporting desktop, tablet, and mobile users.

DigiStream begins as a modular monolith: one deployable API divided into clear product modules. Media delivery, real-time events, durable business operations, large object storage, and external payments remain separate responsibilities even when development services share a machine.

## Repository applications

### Web application

`apps/web` contains the creator and listener browser experiences. The layout is responsive rather than device-specific:

- desktop: persistent navigation, multi-column dashboards, and wide monitoring panels
- tablet: compact navigation and two-column content where space permits
- mobile: touch-friendly controls, stacked cards, and bottom navigation

The same server-side business rules and authorization policies apply at every viewport size.

### API

`apps/api` is a Fastify and TypeScript service. It owns:

- authentication and revocable sessions
- profiles and platform capabilities
- organisations, memberships, invitations, and roles
- channels, broadcasts, and stream-session coordination
- real-time authorization and durable audience interaction
- recording metadata and storage authorization
- following, notifications, moderation, and reporting
- analytics ingestion and controlled query APIs
- commerce orchestration and provider verification when introduced
- health, audit, and operational endpoints

### Shared contracts

`packages/contracts` contains stable request, response, state, and event contracts shared by the web application and API. Private database rows are never returned directly; modules construct explicit DTOs.

## Modular backend convention

New backend features belong under `apps/api/src/modules/<feature>/` and separate responsibilities:

```text
modules/<feature>/
├── <feature>.routes.ts       HTTP registration and schemas
├── <feature>.controller.ts   request-to-service adaptation
├── <feature>.service.ts      business rules and authorization
├── <feature>.repository.ts   PostgreSQL queries and projections
├── <feature>.types.ts        internal module types
└── <feature>.test.ts         focused tests where appropriate
```

Small modules may combine controller and route code, but database queries and business authorization must not be scattered across unrelated handlers.

The normal persistent request flow is:

```text
client
  -> route and request schema
  -> authentication
  -> controller
  -> service authorization and business rules
  -> repository or external adapter
  -> explicit response DTO
```

Cross-cutting HTTP behaviour lives under `apps/api/src/http/`, including safe errors, request correlation, pagination rules, and later rate limiting.

## Data and media services

- PostgreSQL: durable users, sessions, profiles, organisations, memberships, channels, broadcasts, messages, notifications, recordings, audit events, and financial ledgers
- Redis: later presence, shared rate limits, short-lived stream state, distributed real-time adapters, and queues when those features require it
- Object storage: private artwork, recordings, exports, and uploaded documents
- LiveKit: interactive creator contribution, guest participation, backstage rooms, host monitoring, call-ins, and other ultra-low-latency participant paths
- OvenMediaEngine: public one-to-many delivery through WebRTC and LL-HLS, public playback health, and later recording/delivery integration

DigiStream does not add a service merely because it appears on an architecture diagram. Infrastructure is introduced when a feature requires it, but LiveKit and OvenMediaEngine are the selected media direction.

## Traffic separation

### Persistent application data

HTTPS API operations manage durable records and business rules. They use PostgreSQL transactions and constraints where several writes must succeed together.

### Real-time application events

A later real-time gateway handles chat, reactions, presence, typing, notifications, and broadcast-state updates. Every connection and room join is authenticated and authorized by server-loaded data. Durable events are stored before emission when recovery, history, moderation, or auditability requires it.

Room names are server generated, for example:

```text
broadcast:<broadcastId>
user:<userId>
organisation:<organisationId>
```

Clients never gain access merely by supplying a room name. Reconnect logic reauthenticates, rejoins authorized rooms, and refetches missed durable state. Event handlers use idempotency identifiers when retries could duplicate durable effects.

### Continuous audio

The Fastify API never transports continuous audio payloads. It authorizes media access, creates short-lived credentials, coordinates broadcast state, and receives health/status events from media adapters.

The approved media path is:

```text
creator or guest
  -> server-authorized LiveKit room
  -> creator/guest/backstage real-time audio
  -> controlled egress or relay into OvenMediaEngine
  -> public WebRTC and/or LL-HLS delivery
  -> listener player
```

Responsibilities are intentionally split:

1. **LiveKit** handles creator publishing, guest participation, backstage coordination, host return audio, monitoring, and call-in sessions.
2. **OvenMediaEngine** handles public one-to-many listener delivery through WebRTC and LL-HLS.
3. **Fastify** owns product authorization, broadcast state, tenant rules, credential issuance, public metadata, and media health coordination.
4. **PostgreSQL** stores durable stream-session, broadcast, ownership, visibility, and audit records.
5. **Object storage and workers** handle recordings and replay processing separately from the live path.

Icecast is not part of the DigiStream implementation plan. It is mentioned only in the team handbook comparison because that handbook selected Icecast for its own architecture.

The media integration must remain behind interfaces so provider-specific SDK calls do not leak into unrelated business modules. A broadcast cannot become `live` merely because its scheduled time arrived; DigiStream must confirm the authorized source and listener delivery path are healthy.

## Trust boundaries

Untrusted data crosses these boundaries:

- browser to API
- browser to real-time gateway
- creator or guest to LiveKit
- LiveKit egress/relay to OvenMediaEngine
- listener to OvenMediaEngine playback
- API to object storage
- payment provider to webhook endpoint
- administrator interface to privileged APIs
- reverse proxy to internal services

The server independently validates IDs, roles, tenant membership, ownership, account status, resource visibility, LiveKit room grants, OvenMediaEngine playback authorization, amounts, currencies, file content, storage keys, provider claims, and retry identifiers.

## Visibility and authorization

Authorization combines all relevant policies rather than checking only one role:

```text
identity
+ active account status
+ platform capability
+ organisation membership and role
+ resource ownership
+ resource visibility
+ moderation state
+ operation-specific business rule
```

Public, unlisted, and private content are filtered in repository or service policies before DTO construction. Hiding a frontend button or omitting an item from discovery is never a security boundary. Private media credentials and playback access must be issued only after the backend checks these policies.

## Failure isolation

DigiStream should degrade safely:

- application real-time unavailable: live audio and normal API operations may continue; chat and immediate updates pause
- LiveKit unavailable: creator publishing, guest participation, backstage monitoring, and call-ins stop safely; saved content and ordinary APIs remain available
- OvenMediaEngine unavailable: public live playback stops safely; the website, schedules, profiles, and saved recordings may continue
- LiveKit-to-OvenMediaEngine relay unavailable: the source may remain connected while public distribution is marked degraded or unavailable; DigiStream must not falsely report the broadcast as healthy
- PostgreSQL unavailable: durable operations fail with dependency-aware health and safe errors
- object storage unavailable: uploads and recording playback fail without exposing credentials or corrupting metadata
- payment provider unavailable: attempts remain pending or fail safely; no balance is credited from a browser redirect
- recording worker unavailable: the completed broadcast remains valid while recording state waits or retries

## API response and error conventions

All new APIs use explicit DTOs and a stable error envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "request-correlation-id"
  }
}
```

Internal stack traces, SQL text, secrets, credentials, storage keys, and provider payloads are never returned. Logs include the request ID and structured internal error information.

Collections use bounded pagination and deterministic ordering. Sensitive writes define conflict and idempotent-retry behaviour.

## Testing architecture

DigiStream uses several levels:

- unit tests for pure utilities and business rules
- API integration tests for routes, PostgreSQL effects, and safe projections
- authorization tests for roles, tenants, ownership, status, and visibility
- real-time tests for connection authentication, room access, retries, reconnect, and moderation
- LiveKit adapter tests for room grants, token scope, publishing, participant state, and source loss
- OvenMediaEngine adapter tests for ingest/relay state, public playback authorization, WebRTC/LL-HLS health, and delivery failure
- contract tests for the LiveKit-to-OvenMediaEngine handoff
- end-to-end tests for critical creator and listener journeys
- production build verification
- load, failure, backup, restore, and rollback exercises before production

GitHub Actions currently validates PostgreSQL migrations, tests, type checks, and builds on Node.js 22 and 24. Media-service integration tests will be added when those adapters are implemented.

## Engineering principles

- responsive and accessible by default
- multi-tenant organisation boundaries
- explicit public and private DTOs
- secure defaults and least privilege
- observable stream and dependency health
- incremental reviewable pull requests
- tests introduced beside the behaviour they protect
- durable and ephemeral data clearly separated
- idempotency for retries and provider callbacks
- measured scaling rather than premature distributed complexity
- preserve agreed architectural decisions unless evidence and an explicit review justify changing them
