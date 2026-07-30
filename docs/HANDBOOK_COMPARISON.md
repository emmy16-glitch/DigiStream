# DigiStream versus the Echoo developer handbook

## Purpose

The Echoo handbook is a useful product and production checklist. It is not treated as a mandatory implementation template. DigiStream keeps the parts of its current architecture that are stronger and adopts handbook ideas when they improve correctness, product completeness, security, reliability, or maintainability.

## Executive decision

DigiStream keeps its technical core:

- TypeScript rather than untyped JavaScript
- Fastify rather than Express
- PostgreSQL and Drizzle rather than MongoDB and Mongoose
- database-backed opaque cookie sessions rather than browser-managed JWT credentials
- npm workspaces with separate web, API, and shared-contract packages
- multi-tenant organisations and memberships
- GitHub Actions validation on Node.js 22 and 24
- Termux and Codespaces support

DigiStream adopts the handbook's strongest product and engineering ideas:

- explicit visitor, listener, broadcaster, organisation-member, and platform-administrator capabilities
- profiles separated from stations/channels
- public, unlisted, and private visibility enforced by the API
- deliberate station, broadcast, recording, and payment lifecycles
- modular-monolith boundaries: route, controller, service, repository, and external adapter
- separate HTTP, real-time event, and media-delivery paths
- authorization based on role, ownership, tenant, account status, and resource visibility
- bounded pagination, safe public projections, idempotency, and conflict handling
- durable notifications and chat recovery after reconnect
- private object storage with controlled playback and download authorization
- payment webhook verification and exactly-once wallet effects
- moderation, reporting, audit events, observability, backups, rollback, and disaster recovery
- completion gates with concrete evidence before the next phase begins

## Comparison

| Area | Echoo handbook | DigiStream decision |
| --- | --- | --- |
| Language | JavaScript | Keep TypeScript for safer contracts and refactoring |
| HTTP framework | Express | Keep Fastify for schema support, performance, and a smaller backend surface |
| Persistent data | MongoDB | Keep PostgreSQL because users, organisations, memberships, channels, broadcasts, sessions, follows, wallets, and transactions have strong relationships and constraints |
| Database access | Mongoose models | Keep Drizzle schemas plus reviewed SQL migrations |
| Authentication | access JWT plus rotating refresh session | Keep opaque database sessions for the browser-first application; add verification, reset, rate limiting, audit, and session-management features from the handbook |
| Tenancy | broadcaster-owned stations | Keep organisation tenancy while allowing individual creators to own a personal organisation or workspace |
| Product roles | visitor, listener, broadcaster, administrator | Adopt as platform capabilities; keep organisation roles separately |
| Media | Icecast | Keep the media path behind an adapter. Icecast is an approved MVP option for simple audio-only distribution; WebRTC contribution and HLS/LL-HLS remain options for later scale and latency requirements |
| Real time | Socket.IO rooms and events | Adopt the room-authorization, idempotency, reconnect, moderation, and presence rules; choose the concrete transport when that phase begins |
| Recordings | object storage plus metadata lifecycle | Adopt directly, using private objects and PostgreSQL metadata |
| Payments | Paystack or Flutterwave | Adopt provider abstraction, signed webhooks, idempotent ledger entries, reconciliation, and audit requirements |
| Testing | unit, component, API, authorization, socket, end-to-end, build | Adopt the complete testing ladder; retain the existing PostgreSQL CI matrix |
| Operations | Nginx, monitoring, backups, rollback, scaling | Adopt as production gates, without adding infrastructure before measurements justify it |

## Where DigiStream is currently ahead

- Typed shared contracts already exist.
- PostgreSQL constraints protect tenant relationships.
- Migrations are versioned and checksum protected.
- Authentication uses strong password hashing and server-side revocable sessions.
- CI applies migrations and validates tests, types, and builds on two supported Node.js versions.
- The organisation model supports teams rather than only one broadcaster account.

## Where the handbook is currently ahead

- It describes the complete product surface rather than only the next engineering phases.
- It separates a person's profile from the station/channel they operate.
- It defines visibility, ownership, moderation, failure, empty, forbidden, and offline states.
- It describes discovery, following, notifications, recordings, commerce, analytics, and administration.
- It has explicit real-time authorization and reconnect rules.
- It treats backups, rollback, audit, accessibility, monitoring, and disaster recovery as product requirements.

## Rules for adopting handbook ideas

1. Do not replace a working DigiStream component only because the handbook uses another library.
2. Translate product rules into PostgreSQL constraints, Fastify modules, shared TypeScript contracts, and integration tests.
3. Keep every feature behind server-side authorization; hiding a frontend control is never sufficient.
4. Separate durable data, ephemeral events, large media objects, and continuous audio transport.
5. Add infrastructure only when a feature or measured bottleneck requires it.
6. Implement one reviewable backend slice per pull request and merge only after CI passes.
7. Every new feature documents success, empty, validation, unauthorized, forbidden, not-found, conflict, dependency-failure, and retry behaviour where applicable.

## Planned adoption order

1. Standard API errors, request correlation, modular backend conventions, and product specification.
2. Public profiles and platform capabilities.
3. Organisation creation, membership invitations, and tenant authorization.
4. Station/channel visibility, lifecycle, categories, discovery, and ownership.
5. Broadcast scheduling and an enforced lifecycle state machine.
6. Media transport adapter and the first live-audio proof of concept.
7. Secure real-time rooms, chat, reactions, moderation, notifications, and presence.
8. Recording lifecycle, private object storage, replay, retention, and reconciliation.
9. Search, following, analytics, administration, and audited commerce.
10. Deployment, monitoring, backups, rollback, load testing, and disaster recovery.
