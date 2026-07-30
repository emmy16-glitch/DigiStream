# DigiStream implementation roadmap

## Phase 0 — Foundation

- [x] Create the monorepo
- [x] Add responsive web shell
- [x] Add API health endpoints
- [x] Add shared contracts
- [x] Add continuous integration
- [ ] Generate and commit a package lock after the first install

## Phase 1 — Identity and organisations

- [ ] User registration and login
- [ ] Secure password hashing and session/token handling
- [ ] Organisation creation
- [ ] Membership invitations
- [ ] Owner, admin, broadcaster, moderator and analyst roles
- [ ] Tenant-isolation tests

## Phase 2 — Channels and broadcasts

- [ ] Organisation channels
- [ ] Start-now broadcasts
- [ ] Scheduled broadcasts
- [ ] Public event pages and shareable links
- [ ] Broadcast lifecycle state machine

## Phase 3 — Live audio proof of concept

- [ ] Microphone permission and input selection
- [ ] Audio level meter and clipping warning
- [ ] Creator publishing session
- [ ] Listener playback
- [ ] Reconnection behaviour
- [ ] Latency, bitrate, jitter and packet-loss indicators

## Phase 4 — Audience interaction

- [ ] Live chat
- [ ] Reactions
- [ ] Presence and listener counts
- [ ] Moderation and reporting
- [ ] Rate limiting and anti-spam controls

## Phase 5 — Recordings and analytics

- [ ] Automatic recording
- [ ] Recording processing status
- [ ] Replay publishing
- [ ] Creator and organisation dashboards
- [ ] Retention and quality analytics

## Phase 6 — Production readiness

- [ ] PostgreSQL migrations and backups
- [ ] Redis queues and presence
- [ ] Object storage
- [ ] Media-server deployment
- [ ] Security review
- [ ] Load and failure testing
- [ ] Production deployment documentation
