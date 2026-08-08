# DigiStream implementation roadmap

All phases are governed by [`PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md). Reliability, truthful state communication, authorization and plain language are completion gates, not optional polish after feature development.

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
- [x] Refactor remaining backend features into route/controller/service/repository modules
- [x] Add public user profiles and explicit public DTO projections
- [x] Add unique usernames, biography and discoverability preferences
- [x] Add storage-backed avatar metadata and controlled public URLs
- [x] Add platform broadcaster capability and platform-administrator authority
- [x] Add an operator CLI for the first platform-administrator bootstrap
- [x] Add login rate limiting, suspicious-attempt controls and audit events
- [x] Add email verification and password reset tokens
- [x] Add session listing and remote session revocation

## Phase 3 — Organisations and tenant authorization

- [x] Create organisations with an atomic owner membership
- [x] Restrict organisation creation to broadcaster or platform-admin capability
- [x] List and read organisations only through membership
- [x] Allow owner and admin organisation updates
- [x] Return private not-found responses for cross-tenant access
- [x] Add tenant-isolation integration tests for create, list, read and update
- [x] Add personal creator workspace automation
- [x] Add membership invitations and acceptance
- [x] Add role-change and member-removal endpoints
- [x] Prevent removal or demotion of the final owner
- [x] Complete the owner, admin, broadcaster, moderator and analyst permission matrix
- [x] Add organisation audit events

## Phase 4 — Channels, profiles and discovery foundation

- [x] Treat profiles and channels as separate identities
- [x] Add channel lifecycle: draft, pending review, active, suspended and archived
- [x] Add public, unlisted and private visibility
- [x] Add normalized categories and stable organisation-scoped slugs
- [x] Add storage-backed channel artwork metadata
- [x] Add bounded public listing and exact channel detail endpoints
- [x] Add ownership-safe channel management endpoints
- [x] Add following and idempotent unfollow
- [x] Add full-text search, stable cursor pagination and advanced filtering
- [x] Add moderation and soft-delete/retention policy

## Phase 5 — Broadcast scheduling and lifecycle

- [x] Add a start-now flow through draft creation followed by an idempotent start command
- [x] Add scheduled broadcasts
- [x] Enforce draft, scheduled, starting, live, reconnecting, ending, completed, cancelled and failed transitions
- [x] Require both contribution and delivery readiness before declaring a broadcast live
- [x] Add public event pages and shareable links
- [x] Add provider-neutral LiveKit room and OvenMediaEngine stream identifiers
- [x] Add reconnection, source-loss and delivery-loss state
- [x] Add lifecycle authorization, idempotency and optimistic-concurrency tests
- [ ] Verify creator and listener screens always agree on lifecycle state
- [x] Remove every scheduled-state control or visual that falsely implies live playback

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
- [ ] Measure contribution latency, playback latency, bitrate, jitter, packet loss, buffering, failures, fallback rate and listener capacity
- [ ] Run and record the full smoke test against production-like deployed LiveKit and OvenMediaEngine instances
- [ ] Run browser playback compatibility tests across Android Chrome, desktop Chrome, Firefox and Safari

Icecast is not part of the DigiStream implementation plan. It remains only a technology used by the team handbook being compared against.

## Phase 6A — Product trust, resilience and mobile quality gate

This phase blocks decorative expansion until the existing live product behaves honestly and recoverably.

### Correct state and authorization

- [x] Trace the exact backend, authentication, authorization or configuration cause of **Studio action failed**
- [x] Make public listener actions role-aware for organisation owners, admins and broadcasters
- [x] Replace owner-facing **Request to speak** with **Manage broadcast**, **Open studio** or **Open backstage** as appropriate
- [ ] Keep the API as the independent authorization boundary and add matching tests
- [x] Render distinct scheduled, starting, live, reconnecting, ending, completed, cancelled and failed listener layouts
- [x] Remove permanent `LIVE` artwork from scheduled events
- [x] Prevent the `Live now` navigation state from appearing active for an upcoming event
- [ ] Remove developer-facing lifecycle values such as `Version 0` from end-user cards
- [ ] Remove duplicate or competing create-broadcast primary actions in the same state

### Listener reliability and plain language

- [x] Translate WebRTC, LL-HLS and provider language into listener-friendly connection states
- [x] Add evidence-based Stable, Buffering, Reconnecting, Offline and Unavailable states
- [x] Add measured Unstable state from repeated-buffering evidence with bounded recovery to Stable
- [x] Make manual retry primary only after bounded automatic recovery fails
- [x] Hide playback, mute, volume and retry controls while a broadcast is scheduled
- [x] Add a text countdown, exact local date/time and optional calendar action for upcoming events
- [x] Hide or collapse the full mobile volume slider while preserving mute
- [x] Add a contextual route back to discovery from event pages
- [x] Keep technical protocol data available only as secondary diagnostics

### Creator audio and failure recovery

- [x] Add sustained **No signal** detection instead of leaving a zero-level input as neutral `Listening`
- [x] Add Quiet, Good, Loud, Clipping, Muted and Device disconnected labels with dBFS as secondary detail
- [x] Smooth the underlying meter signal with fast attack, slower release and immediate clipping peaks
- [x] Preserve a healthy contribution room when public delivery alone fails, where safe
- [x] Add safe retry or status actions to understood studio failures without duplicate dismiss controls
- [x] Make browser and Android Back close the studio before leaving the workspace

### Call-in, chat and mobile layout

- [x] Convert the mobile request-to-speak panel into a safe-area-aware bottom sheet
- [x] Hide the floating launcher while the panel is open
- [x] Prevent fixed launchers and bottom navigation from covering content
- [x] Handle virtual keyboards with dynamic viewport layout and `visualViewport` only as fallback
- [x] Pre-fill call-in display name and email from the signed-in profile when available
- [x] Keep the request panel open through progress, success confirmation and pending-status transition
- [x] Make the producer-side backstage call-in flow discoverable
- [x] Replace scheduled read-only chat composers and counters with a compact `Chat will open when the broadcast starts` state
- [x] Rename ambiguous mobile `People` navigation to `Backstage`, `Guests` or another approved explicit label

### Consistency and accessibility

- [ ] Standardize enabled and disabled primary-button treatment
- [ ] Add consistent press feedback and focus states across the design system
- [ ] Use the shared icon system instead of browser-dependent Unicode symbols
- [ ] Preserve strong responsive event typography without clipping or overlap
- [ ] Test long titles, keyboard navigation, reduced motion, bright sunlight contrast and mobile safe areas
- [ ] Hide Replay and Stats navigation until real authorised data and failure states exist

### Failure and constrained-network verification

- [ ] Add browser-level WebRTC failure followed by successful LL-HLS playback verification
- [ ] Test temporary listener network loss and recovery without page reload
- [ ] Test high latency, jitter and packet loss
- [ ] Test repeated buffering and bounded retry exhaustion
- [ ] Test creator contribution disconnect and reconnect
- [ ] Test publisher source loss and OvenMediaEngine delivery interruption
- [ ] Test signed playback expiry during an active session
- [ ] Test mobile background/foreground transitions
- [ ] Test low-end devices and constrained CPU or memory
- [ ] Record evidence and logs for every resilience scenario

### Non-technical usability verification

- [ ] Run the complete Select -> Prepare audio -> Go live flow with a non-technical production volunteer without coaching
- [ ] Run the listener and request-to-speak flow with a separate non-technical user
- [ ] Record hesitation, wrong actions and misunderstood states
- [ ] Resolve critical usability findings before adding decorative motion

## Phase 7 — Real-time interaction and notifications

- [x] Authenticate real-time connections using the existing session system
- [x] Authorize server-generated broadcast, organisation and user rooms
- [x] Add durable live chat with client idempotency IDs
- [x] Add rate-limited reactions and expiring typing events
- [x] Add presence with heartbeat and multi-tab handling
- [x] Keep socket presence distinct from media listener counts
- [x] Add moderation: mute, block, slow chat, disable chat and report
- [x] Persist notifications before immediate delivery
- [x] Recover durable history and state after reconnect
- [x] Add abuse, reconnect and unauthorized-room tests

## Phase 8 — Recordings and object storage

- [x] Add private object storage and generated storage keys
- [x] Add recording states: recording, uploading, processing, ready, failed, published, private, archived and deleted
- [x] Add retry-safe processing jobs and reconciliation
- [x] Add checksums, duration, size, format and processing errors
- [x] Add independent playback and download authorization
- [x] Add HTTP range playback through the delivery path
- [x] Add retention, deletion and legal/moderation hold controls with protected cleanup
- [x] Add object-store orphan listing, quarantine and cleanup
- [x] Add creator recording management APIs and an API-backed Replay workspace
- [x] Add public/member replay listening pages and published replay discovery
- [x] Expose public Replay navigation only after the complete authorised listener flow works

## Phase 9 — Product expansion

- [ ] Saved broadcasts and listening history
- [ ] Durable in-app notifications and notification preferences
- [ ] Creator, channel and organisation analytics
- [ ] Audience and stream-quality analytics with accurate metric definitions
- [ ] Expose Stats navigation only after trustworthy metrics, loading, empty, failure and authorization states exist
- [ ] Administrative users, reports, categories, audit logs and moderation queues
- [ ] Accessibility and offline/error recovery for every product flow

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
- [ ] Playback fallback, buffering, packet-loss, reconnect and contribution/delivery metrics
- [ ] PostgreSQL backups and restore drills
- [ ] Object-storage backup and lifecycle policy
- [ ] Compatible migrations, staged releases and rollback rehearsal
- [ ] End-to-end smoke tests for registration, channels, streaming, chat, call-ins, backstage, recording, notifications, admin and logout
- [ ] Load, constrained-network, partial-failure and abuse testing
- [ ] SLI, SLO, error-budget, RTO and RPO definitions
- [ ] Incident, recovery and disaster-recovery runbooks
- [ ] Real HTTPS domain and correct listener deep-link routing
- [ ] Add a web app manifest, production icons and standalone metadata after live reliability is proven
- [ ] Add a deliberately limited service-worker offline shell without caching protected or short-lived media URLs
- [ ] Verify safe PWA update behaviour and installed-mode playback

## Completion gate rule

A later phase does not begin with an unexplained failure from the previous phase. Each pull request records the behaviour added, tests run, lifecycle states covered, roles checked, dependency failures considered, mobile and accessibility behaviour, and evidence required to continue.

A pull request must not merge when:

- creator and listener lifecycle states disagree;
- a protected action lacks independent backend authorization;
- scheduled content can look or behave live;
- a fixed mobile control can cover required content;
- an error has no understood cause or safe next action;
- fake data is used to make an unfinished area look complete;
- an implementation change leaves its documentation stale.
