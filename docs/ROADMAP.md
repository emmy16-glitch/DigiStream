# DigiStream implementation roadmap

## Phase 0 — Foundation

- [x] Create the monorepo
- [x] Add responsive web shell
- [x] Add API health endpoints
- [x] Add shared contracts
- [x] Add continuous integration
- [x] Generate and commit a package lock
- [x] Add Codespaces and Termux development guidance

## Phase 1 — Backend data and authentication foundation

- [x] Select PostgreSQL as the system of record
- [x] Add typed users, organisations, memberships, channels and broadcasts schema
- [x] Add versioned checksum-protected SQL migrations
- [x] Add database-aware health checks
- [x] Add PostgreSQL integration tests and CI service
- [x] Add user registration, login, current-user and logout endpoints
- [x] Add secure password hashing and database-backed revocable sessions
- [x] Add a reproducible package lock and deterministic CI installation

## Phase 2 — Production API and identity model

- [x] Document the team-handbook comparison and DigiStream adoption rules
- [x] Define product roles, entities, traffic paths, visibility and lifecycles
- [x] Standardize API error envelopes, request IDs and safe not-found handling
- [ ] Refactor remaining backend features into route/controller/service/repository modules
- [x] Add public user profiles and explicit public DTO projections
- [x] Add unique usernames, biography and discoverability preferences
- [ ] Add storage-backed avatar metadata and controlled public URLs
- [x] Add platform broadcaster capability and platform-administrator authority
- [ ] Add an operator CLI for the first platform-administrator bootstrap
- [ ] Add login rate limiting, suspicious-attempt controls and audit events
- [ ] Add email verification and password reset tokens
- [ ] Add session listing and remote session revocation

## Phase 3 — Organisations and tenant authorization

- [x] Create organisations with an atomic owner membership
- [x] Restrict organisation creation to broadcaster or platform-admin capability
- [x] List and read organisations only through membership
- [x] Allow owner and admin organisation updates
- [x] Return private not-found responses for cross-tenant access
- [x] Add tenant-isolation integration tests for create, list, read and update
- [ ] Add personal creator workspace automation
- [x] Add membership invitations and acceptance
- [x] Add role-change and member-removal endpoints
- [x] Prevent removal or demotion of the final owner
- [x] Complete the owner, admin, broadcaster, moderator and analyst permission matrix
- [ ] Add organisation audit events

## Phase 4 — Channels, profiles and discovery foundation

- [x] Treat profiles and channels as separate identities
- [x] Add channel lifecycle: draft, pending review, active, suspended and archived
- [x] Add public, unlisted and private visibility
- [x] Add normalized categories and stable organisation-scoped slugs
- [ ] Add storage-backed channel artwork metadata
- [x] Add bounded public listing and exact channel detail endpoints
- [x] Add ownership-safe channel management endpoints
- [ ] Add following and idempotent unfollow
- [ ] Add full-text search, stable cursor pagination and advanced filtering
- [ ] Add moderation and soft-delete/retention policy

## Phase 5 — Broadcast scheduling and lifecycle

- [x] Add a start-now flow through draft creation followed by an idempotent start command
- [x] Add scheduled broadcasts
- [x] Enforce draft, scheduled, starting, live, reconnecting, ending, completed, cancelled and failed transitions
- [x] Require both contribution and delivery readiness before declaring a broadcast live
- [x] Add public event pages and shareable links
- [x] Add provider-neutral LiveKit room and OvenMediaEngine stream identifiers
- [x] Add reconnection, source-loss and delivery-loss state
- [x] Add lifecycle authorization, idempotency and optimistic-concurrency tests

## Phase 6 — Live media foundation

- [x] Define provider-neutral media-event and contribution-provider contracts in the Fastify backend
- [x] Add idempotent LiveKit RoomService provisioning through the documented Twirp API
- [x] Generate short-lived, server-authorized LiveKit host, guest and monitor tokens without exposing server secrets
- [x] Restrict publisher credentials to microphone tracks and monitor credentials to subscribe-only access
- [x] Connect the web creator client to LiveKit microphone publishing and host monitoring
- [x] Add external guest invitations, backstage admission, participant removal and call-ins
- [x] Add an external guest browser waiting room with microphone setup and admitted LiveKit join
- [x] Add a creator backstage web workspace for guest links, admission, participant controls and call-in decisions
- [x] Add listener-side call-in request controls to public and unlisted broadcast pages
- [x] Integrate OvenMediaEngine for public WebRTC and LL-HLS listener distribution
- [x] Define and implement the controlled LiveKit Egress relay into OvenMediaEngine delivery
- [x] Add microphone permission, input selection, audio level and clipping feedback
- [x] Verify browser contribution readiness through LiveKit RoomService before changing broadcast state
- [x] Add authorized public, unlisted and private listener playback
- [x] Add responsive public discovery and exact public, unlisted and private listener routes
- [x] Add WebRTC-first listener playback with automatic LL-HLS fallback
- [x] Add listener buffering, network recovery, mute and volume controls
- [x] Confirm contribution and delivery health before marking a broadcast live
- [x] Define reconnection, source-loss and delivery-failure behaviour
- [x] Add Docker Compose infrastructure for PostgreSQL, Redis, LiveKit, Egress, OME and the API
- [x] Add a real room-to-Egress-to-OME-to-LL-HLS smoke-test workflow
- [ ] Measure contribution latency, playback latency, bitrate, jitter, failures and listener capacity
- [ ] Run and record the full smoke test against production-like deployed LiveKit and OvenMediaEngine instances
- [ ] Run browser playback compatibility tests across Android Chrome, desktop Chrome, Firefox and Safari

Icecast is not part of the DigiStream implementation plan. It remains only a technology used by the team handbook being compared against.

## Phase 7 — Real-time interaction and notifications

- [x] Authenticate real-time connections using the existing session system
- [x] Authorize server-generated broadcast, organisation and user rooms
- [ ] Add durable live chat with client idempotency IDs
- [ ] Add rate-limited reactions and expiring typing events
- [ ] Add presence with heartbeat and multi-tab handling
- [ ] Keep socket presence distinct from media listener counts
- [ ] Add moderation: mute, block, slow chat, disable chat and report
- [ ] Persist notifications before immediate delivery
- [ ] Recover durable history and state after reconnect
- [ ] Add abuse, reconnect and unauthorized-room tests

## Phase 8 — Recordings and object storage

- [ ] Add private object storage and generated storage keys
- [ ] Add recording states: recording, uploading, processing, ready, failed, published, private, archived and deleted
- [ ] Add retry-safe processing jobs and reconciliation
- [ ] Add checksums, duration, size, format and processing errors
- [ ] Add independent playback and download authorization
- [ ] Add HTTP range playback through the delivery path
- [ ] Add retention, deletion, legal/moderation hold and orphan cleanup
- [ ] Add replay pages and recording management APIs

## Phase 9 — Product expansion

- [ ] Saved broadcasts and listening history
- [ ] Durable in-app notifications and notification preferences
- [ ] Creator, channel and organisation analytics
- [ ] Audience and stream-quality analytics with accurate metric labels
- [ ] Administrative users, reports, categories, audit logs and moderation queues
- [ ] Accessibility and offline/error recovery for product flows

## Phase 10 — Commerce

- [ ] Provider abstraction for Paystack and/or Flutterwave
- [ ] Pending payment attempts before checkout initialization
- [ ] Signed webhook verification independent of browser redirects
- [ ] Immutable wallet ledger entries
- [ ] Exactly-once credit, tip, fee, refund and withdrawal effects
- [ ] Idempotency, reconciliation and manual-review states
- [ ] Currency, amount, ownership and provider-reference validation
- [ ] Financial audit events and authorization tests

## Phase 11 — Production readiness

- [ ] Least-privilege PostgreSQL users and secret management
- [ ] Redis for queues, shared rate limits and distributed presence when required
- [ ] Reverse proxy, TLS, WebSocket, WebRTC and LL-HLS configuration
- [ ] Security headers, CORS policy and dependency scanning
- [ ] Structured logs, request IDs, metrics, traces and alerts
- [ ] PostgreSQL backups and restore drills
- [ ] Object-storage backup and lifecycle policy
- [ ] Compatible migrations, staged releases and rollback rehearsal
- [ ] End-to-end smoke tests for registration, channels, streaming, chat, recording, notifications, admin and logout
- [ ] Load, partial-failure and abuse testing
- [ ] SLI, SLO, error-budget, RTO and RPO definitions
- [ ] Incident, recovery and disaster-recovery runbooks

## Completion gate rule

A later phase does not begin with an unexplained failure from the previous phase. Each pull request records the behaviour added, tests run, dependency failures considered, and evidence required to continue.
