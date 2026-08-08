# DigiStream product specification

The detailed listener, creator, mobile, reliability and AI-contributor rules are defined in [`PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md). That standard is normative for product-facing state and interaction decisions.

## Product goal

DigiStream is an audio-first platform where individuals and organisations can operate channels, schedule or start broadcasts, distribute live audio, interact with listeners, publish recordings, understand quality and audience behaviour, and eventually receive financial support.

The product API, real-time event system, and media-delivery path remain separate so one partial failure does not unnecessarily stop the whole platform.

The core quality promise is that DigiStream tells the truth about whether audio is scheduled, starting, live, reconnecting, ending or unavailable and gives non-technical users a safe next action.

## User and authority model

DigiStream separates platform capability from organisation authority.

### Visitor

A visitor is not signed in. A visitor may browse approved public content and listen to public streams when the broadcast policy permits it.

### Authenticated listener

Every active registered user is a listener. A listener may manage a profile, follow permitted creators or organisations, save content, receive notifications, join authorized conversations, request to speak when call-ins are open, and support creators when commerce is introduced.

### Broadcaster capability

A broadcaster is an active user allowed to create or operate a personal or organisation channel. Broadcaster approval may be automatic during development and configurable later.

### Organisation roles

Organisation permissions are independent of platform capability:

- owner: controls the organisation and its membership
- admin: manages most organisation resources and members except protected owner actions
- broadcaster: creates and operates channels and broadcasts
- moderator: moderates audience interaction and reports
- analyst: reads organisation analytics without changing operational resources

### Platform administrator

A platform administrator manages platform-wide moderation, categories, user status, reports, payment operations, audit review, and system configuration. Platform administration is not granted by an organisation role.

### Role-aware presentation

The UI presents the most relevant action for the current user's relationship to the resource, but the API remains the security boundary.

- Ordinary listeners may see listen, chat and request-to-speak actions when policy permits.
- Owners, admins and broadcasters viewing their own organisation event should receive creator actions such as **Manage broadcast**, **Open studio** or **Open backstage**, not a prominent listener call-in action.
- Moderators receive only authorised moderation controls.
- Analysts receive read-only information and no operational controls.
- Every role-aware rendering rule requires corresponding backend authorization tests.

## Core entities

- user: private authentication identity and account status
- user profile: approved public identity fields, username, biography, avatar metadata, and preferences
- platform capability: broadcaster or platform-administrator authority
- organisation: a tenant or creator workspace
- organisation membership: a user's role inside one organisation
- channel: the public or restricted streaming identity operated by an organisation
- broadcast: a scheduled or immediate programme attached to a channel
- stream session: one media-source and listener-delivery session for a broadcast
- follow: durable listener relationship to a profile, channel, or organisation according to product policy
- chat message: durable audience interaction attached to a broadcast
- call-in request: listener request, review status and bounded status-access record
- guest invitation: short-lived approved route from listener request or direct producer invitation into the waiting room
- backstage participant: authorised LiveKit host, guest or monitor state managed by production roles
- reaction: rate-limited ephemeral event or aggregated durable count
- notification: durable user-facing event with delivery and read state
- recording: governed media metadata and private storage key for a completed broadcast
- report: moderation complaint and resolution record
- audit event: sensitive action record
- wallet account and ledger entry: later commerce records; balances must derive from immutable entries
- payment attempt: provider operation with idempotency, signature verification, and reconciliation state

## Visibility

Resources that support visibility use explicit policies:

- public: eligible for discovery and anonymous access
- unlisted: accessible through an authorized link but excluded from normal discovery
- private: requires membership, invitation, ownership, or another explicit grant

Visibility is always enforced by the API and media authorization path. Removing an item from search does not protect it.

## Lifecycles

### Channel

`draft -> pending-approval -> active -> suspended -> archived`

Development may bypass approval, but the stored state remains explicit. Suspension and restoration require an authorised moderation action with a recorded actor and reason. Soft-deleted channels are immediately unavailable to ordinary product surfaces, remain recoverable for 30 days, and restore to `draft` rather than silently returning to public visibility. Permanent purge and legal-hold handling remain separate governed operations.

### Broadcast

`draft -> scheduled -> starting -> live -> reconnecting -> ending -> completed`

Alternative terminal paths include `cancelled` and `failed`. A scheduled time alone never proves that audio is live. A browser microphone level alone never proves that listeners can hear audio. Contribution and public delivery readiness must be independently confirmed.

Every lifecycle state has distinct listener and creator controls. Scheduled broadcasts do not show active playback controls or permanent `LIVE` artwork.

### Call-in

`pending -> approved-or-rejected`

Approval may create a separate guest invitation. Approval does not automatically activate the listener microphone. The complete flow is:

`listener request -> producer review -> approve or reject -> guest invitation -> waiting room -> admit -> guest joins backstage`

### Recording

`not-requested -> recording -> uploading -> processing -> ready -> published/private -> archived/deleted`

A recording may enter `failed` and must support a safe retry without creating conflicting records.

### Notification

`created -> delivered-or-available -> read -> archived`

Immediate delivery is optional; the durable notification API is authoritative after reconnect or offline periods.

### Payment

`created -> pending-provider -> provider-confirmed -> independently-verified -> applied`

Alternative paths include `failed`, `expired`, `refunded`, `reversed`, and `manual-review`. Browser redirects never prove payment success.

## Traffic paths

### Persistent application operation

`client -> HTTPS API -> authentication -> validation -> authorization -> service -> repository/provider -> response`

### Immediate application event

`client -> authenticated real-time connection -> room authorization -> validation/rate limit/moderation -> durable write when required -> acknowledgement -> authorized broadcast`

### Continuous audio

`creator source -> media contribution endpoint -> media server or adapter -> listener delivery endpoint -> browser player`

The normal Fastify API never carries the continuous audio payload.

### Recording

`media source/server -> recording worker -> private object storage -> processing/reconciliation -> authorized playback URL or delivery route`

## Minimum viable release

The first useful release contains:

- registration, login, logout, and revocable sessions
- safe public profiles
- organisation or personal creator workspace
- channel creation with explicit ownership and visibility
- scheduled and immediate broadcasts with a valid state machine
- creator audio publishing and public listening
- truthful broadcast status, bounded reconnection and understandable failure behaviour
- basic authorized chat and moderation
- listener call-in requests and producer backstage review
- following and durable in-app notifications
- basic recording and replay policy
- basic platform administration and health monitoring

Wallets, withdrawals, advanced recommendations, mobile push notifications, advanced analytics, and multi-region media delivery follow after the core streaming experience is stable.

Navigation for Replay, Stats or another later feature remains hidden until its real data, authorization, empty, loading and failure states exist.

## Cross-cutting quality requirements

Every data-driven feature defines and tests:

- successful response
- validation failure
- unauthenticated response
- forbidden response
- not-found response
- conflict or idempotent retry behaviour
- empty collection behaviour
- dependency unavailable behaviour
- offline, reconnecting and partial-failure behaviour where relevant
- bounded pagination and stable ordering
- public versus private projection
- account status, role, ownership, tenant, and visibility checks
- creator and listener agreement on the same lifecycle state
- audit requirement for sensitive actions
- accessible client behaviour when a UI exists
- mobile safe-area and virtual-keyboard behaviour for fixed controls
- long text, localisation and responsive wrapping
- useful logs, request IDs, metrics, and alerts where appropriate
- plain-language primary copy with optional technical diagnostics
- no fake metrics, fake health states, fake recordings or fake analytics

Product-facing work also follows the pull-request checklist in [`PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md).

## Security requirements

- Secrets never appear in source code, logs, URLs, public DTOs, or client storage.
- Passwords use slow salted hashing.
- Session and one-time tokens are stored only as hashes.
- Authentication and authorization remain separate.
- The backend independently verifies ownership, tenant, status, role, visibility, amounts, provider claims, and storage keys.
- Login, chat, call-in, guest, follow, report, upload, stream-control, and payment endpoints are rate limited according to risk.
- File type, size, content, ownership, and storage destination are validated.
- Payment webhooks verify signatures and apply ledger effects exactly once.
- Private media remains private by default and uses short-lived controlled access.
- Sensitive changes create audit events.
- Role-aware UI never replaces server-side checks.

## Reliability requirements

- Database migrations are versioned, checksum protected, and compatible with rollback planning.
- Jobs and provider callbacks are idempotent and retry safe.
- A real-time failure does not automatically stop live audio.
- A media failure does not expose private API data.
- Player recovery is bounded and reports what is happening before requiring manual retry.
- WebRTC-first playback has a verified LL-HLS fallback path.
- Contribution readiness and delivery readiness remain independent.
- A delivery failure does not unnecessarily destroy a still-healthy contribution connection.
- Recording and object-storage partial failures are reconciled.
- Backups are tested through restore drills before production.
- Releases have health checks, happy-path smoke tests, constrained-network and failure tests, monitoring and a documented rollback path.
- Production readiness includes measured latency, jitter, packet loss, buffering, fallback, error and capacity behaviour.

## User-language requirements

Primary product copy must be understandable without knowledge of LiveKit, OvenMediaEngine, WebRTC, LL-HLS, dBFS or lifecycle versions.

Technical values may appear as secondary diagnostics for experienced operators. Internal lifecycle counters such as `Version 0` never appear on ordinary user cards.

## Business decisions still required

- Whether broadcaster approval is automatic or reviewed
- Whether anonymous visitors may listen to every public broadcast
- Whether a user may create multiple personal workspaces
- Maximum simultaneous live broadcasts per channel and organisation
- Chat retention and moderation policy
- Default recording and retention policy
- Public, unlisted, and private sharing behaviour
- Platform fees, supported currencies, minimum withdrawals, and verification requirements
- Permanent channel purge and legal-hold policy after the 30-day soft-delete recovery window
