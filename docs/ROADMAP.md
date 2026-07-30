# DigiStream implementation roadmap

## Phase 0 — Foundation

- [x] Create the monorepo
- [x] Add responsive web shell
- [x] Add API health endpoints
- [x] Add shared contracts
- [x] Add continuous integration
- [x] Generate and commit a package lock after the first dependency update

## Phase 1 — Backend data foundation

- [x] Select PostgreSQL as the system of record
- [x] Add typed users, organisations, memberships, channels and broadcasts schema
- [x] Add versioned checksum-protected SQL migrations
- [x] Add database-aware health checks
- [x] Add PostgreSQL integration tests and CI service
- [ ] Document database backup and restore before production deployment

## Phase 2 — Identity and organisations

- [x] User registration and login
- [x] Secure password hashing and database-backed session handling
- [x] Current-user and logout endpoints
- [ ] Login rate limiting and suspicious-attempt controls
- [ ] Email verification and password reset
- [ ] Organisation creation
- [ ] Membership invitations
- [ ] Owner, admin, broadcaster, moderator and analyst roles
- [ ] Tenant-isolation tests

## Phase 3 — Channels and broadcasts

- [ ] Organisation channels
- [ ] Start-now broadcasts
- [ ] Scheduled broadcasts
- [ ] Public event pages and shareable links
- [ ] Broadcast lifecycle state machine

## Phase 4 — Live audio proof of concept

- [ ] Microphone permission and input selection
- [ ] Audio level meter and clipping warning
- [ ] Creator publishing session
- [ ] Listener playback
- [ ] Reconnection behaviour
- [ ] Latency, bitrate, jitter and packet-loss indicators

## Phase 5 — Audience interaction

- [ ] Live chat
- [ ] Reactions
- [ ] Presence and listener counts
- [ ] Moderation and reporting
- [ ] Rate limiting and anti-spam controls

## Phase 6 — Recordings and analytics

- [ ] Automatic recording
- [ ] Recording processing status
- [ ] Replay publishing
- [ ] Creator and organisation dashboards
- [ ] Retention and quality analytics

## Phase 7 — Production readiness

- [ ] PostgreSQL backups and restore drills
- [ ] Redis queues and presence
- [ ] Object storage
- [ ] Media-server deployment
- [ ] Security review
- [ ] Load and failure testing
- [ ] Production deployment documentation
