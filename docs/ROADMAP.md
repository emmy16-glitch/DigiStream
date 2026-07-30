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
- [ ] Refactor backend features into route/controller/service/repository modules
- [ ] Add public user profiles and explicit public DTO projections
- [ ] Add usernames, biography, avatar metadata and privacy preferences
- [ ] Add platform broadcaster capability and platform-administrator authority
- [ ] Add login rate limiting, suspicious-attempt controls and audit events
- [ ] Add email verification and password reset tokens
- [ ] Add session listing and remote session revocation

## Phase 3 — Organisations and tenant authorization

- [ ] Organisation creation and personal creator workspaces
- [ ] Membership invitations and acceptance
- [ ] Owner, admin, broadcaster, moderator and analyst permissions
- [ ] Prevention of removing the final owner
- [ ] Role, ownership, tenant, status and visibility authorization helpers
- [ ] Tenant-isolation and permission-matrix integration tests
- [ ] Organisation audit events

## Phase 4 — Channels, profiles and discovery foundation

- [ ] Treat profiles and channels as separate identities
- [ ] Add channel lifecycle: draft, pending approval, active, suspended and archived
- [ ] Add public, unlisted and private visibility
- [ ] Add categories, artwork metadata and stable slugs
- [ ] Add bounded public listing and channel detail endpoints
- [ ] Add ownership-safe channel management endpoints
- [ ] Add following and idempotent unfollow
- [ ] Add search, filtering, stable sorting and pagination
- [ ] Add moderation and soft-delete/retention policy

## Phase 5 — Broadcast scheduling and lifecycle

- [ ] Start-now broadcasts
- [ ] Scheduled broadcasts
- [ ] Enforce draft, scheduled, starting, live, ending, completed, cancelled and failed transitions
- [ ] Confirm the media source before declaring a broadcast live
- [ ] Add public event pages and shareable links
- [ ] Add stream-session records and reconnection state
- [ ] Add lifecycle authorization, idempotency and concurrency tests

## Phase 6 — Live audio proof of concept

- [ ] Define a media-adapter interface
- [ ] Evaluate Icecast as the simplest audio-only MVP transport
- [ ] Add microphone permission and input selection
- [ ] Add audio level meter and clipping warning
- [ ] Add creator publishing credentials without exposing source secrets
- [ ] Add authorized listener playback
- [ ] Add source, mount/session and playback health
- [ ] Add reconnection behaviour
- [ ] Measure latency, bitrate, jitter, failures and listener capacity
- [ ] Retain a path to WebRTC contribution and HLS/LL-HLS delivery when justified

## Phase 7 — Real-time interaction and notifications

- [ ] Authenticate real-time connections using the existing session system
- [ ] Authorize server-generated broadcast, organisation and user rooms
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
- [ ] Reverse proxy, TLS, WebSocket and streaming-specific configuration
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
