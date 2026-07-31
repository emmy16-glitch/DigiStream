# DigiStream

DigiStream is an audio-first live-streaming platform for creators, organisations and listeners. It is designed as one responsive web product that works across phones, tablets and desktop computers.

## Product quality rule

DigiStream is quality-gated by reliability, truthful state communication, correct authorization and plain language before decorative polish. Every human contributor and AI coding agent must read [`docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md) before changing listener, creator, guest, backstage, chat, navigation or media UI behaviour.

A scheduled broadcast must never look live, a listener-only action must not be promoted to an authorised owner, incomplete product areas must not pretend to work, and media/network failures must have explicit understandable recovery states.

## Current foundation

- Responsive React creator dashboard and public listener application
- Browser creator studio with microphone permission, input selection, live levels and clipping feedback
- LiveKit room join, microphone publishing, mute, guest monitoring and reconnect controls
- Server-verified browser contribution readiness before broadcast state changes
- Public live-audio discovery and exact unlisted listener links
- WebRTC-first OvenPlayer playback with automatic LL-HLS fallback
- Listener volume, mute, buffering, offline and bounded recovery controls
- Listener call-in requests with durable status tracking
- Creator backstage review, approval, guest invitation, admission, mute and removal controls
- Private listener routes protected by existing organisation membership and HttpOnly sessions
- Fastify and TypeScript API
- PostgreSQL and Drizzle typed data model
- Versioned checksum-protected SQL migrations
- Registration, login, current-user, logout and revocable database sessions
- Secure scrypt password hashing and opaque HttpOnly cookies
- Standard safe API errors and request correlation IDs
- Shared TypeScript contracts
- Organisations, invitations, tenant roles, channels and broadcast lifecycles
- LiveKit creator/guest rooms and short-lived contribution credentials
- Persistent LiveKit Egress to OvenMediaEngine delivery bridge
- Signed WebRTC and LL-HLS listener playback
- Complete Docker Compose media development stack and real end-to-end smoke test
- npm workspace monorepo with a committed dependency lock
- PostgreSQL integration tests and GitHub Actions validation on Node.js 22 and Node.js 24
- Reproducible GitHub Codespaces environment
- Termux-friendly application development commands

## Repository structure

```text
DigiStream/
├── apps/
│   ├── api/          # Fastify API, PostgreSQL and media orchestration
│   └── web/          # React creator studio and responsive listener web app
├── packages/
│   └── contracts/    # Shared API contracts
├── infra/            # Redis, LiveKit, Egress and OME configuration
├── scripts/          # Stack commands and end-to-end media smoke test
├── docs/             # Product, architecture, quality, roadmap and development guides
├── compose.media.yml # Complete local media infrastructure
├── .devcontainer/    # GitHub Codespaces environment
└── .github/workflows # Continuous integration and media smoke workflow
```

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- PostgreSQL for database-backed application development and integration tests
- Docker Engine and Docker Compose v2 for the complete media stack
- HTTPS or `localhost` for browser microphone access
- Secure `wss://` WebRTC and `https://` LL-HLS endpoints for an HTTPS production listener page

On Termux:

```bash
pkg update
pkg install nodejs-lts git
```

PostgreSQL can run on another reachable machine or a development cloud service when a reliable local Android package is unavailable. The Docker media stack should run on a desktop, VM or remote Docker host rather than directly inside Android Termux.

## Run the application locally

```bash
git clone https://github.com/emmy16-glitch/DigiStream.git
cd DigiStream
npm ci
cp .env.example .env
npm run db:migrate
```

Start the API in one Termux session:

```bash
npm run dev:api
```

Start the web app in another Termux session:

```bash
npm run dev:web -- --host 0.0.0.0
```

Open `http://127.0.0.1:5173` on the phone. A computer on the same network can use the phone's local IP address instead of `127.0.0.1`.

The creator dashboard's **Start a broadcast**, **Broadcasts**, **Configure** and **Run sound check** controls open the creator studio. The studio uses the existing cookie session, lets the creator select an organisation/channel/broadcast, tests the microphone, joins LiveKit and starts the Egress-to-OME public delivery path.

Open the public listener application at:

```text
http://127.0.0.1:5173/listen
```

Exact listener routes use:

```text
/listen/:organisationSlug/:channelSlug/:broadcastSlug
/listen/member/:organisationId/:broadcastId
```

The public route supports public and unlisted broadcasts. The member route requires an authenticated current organisation member. Production web hosting must rewrite these nested paths to the React `index.html`.

For browser-based development from a phone, see [`docs/CODESPACES.md`](docs/CODESPACES.md). For creator workflow and security boundaries, see [`docs/CREATOR_BROADCAST_STUDIO.md`](docs/CREATOR_BROADCAST_STUDIO.md). For the listener player, transport fallback and deployment requirements, see [`docs/LISTENER_PLAYBACK.md`](docs/LISTENER_PLAYBACK.md).

## Run the complete media stack

On a Docker-capable machine:

```bash
npm run media:up
```

This starts PostgreSQL, Redis, LiveKit, LiveKit Egress, OvenMediaEngine and the production-style Fastify API container.

Run the real LiveKit-to-OME verification:

```bash
npm run media:smoke
```

Stop the stack:

```bash
npm run media:down
```

Remove the stack and its local data volumes:

```bash
npm run media:reset
```

See [`docs/LOCAL_MEDIA_STACK.md`](docs/LOCAL_MEDIA_STACK.md) for ports, architecture, remote-host settings and troubleshooting.

## Validation

```bash
npm run check
```

GitHub Actions starts PostgreSQL, applies migrations, runs integration tests, checks TypeScript and builds the API and web application on Node.js 22 and Node.js 24. A separate infrastructure job validates the Compose model, parses the OvenMediaEngine XML and builds the production API container image.

The manually triggered **Media stack smoke** workflow starts the full media infrastructure and verifies a real LiveKit room, LiveKit Egress RTMP output, OvenMediaEngine delivery and signed LL-HLS manifest. This happy-path proof does not replace browser-level fallback, constrained-network, source-loss, reconnect and capacity testing required by the product quality standard.

Python is not required for the React and Fastify applications. The CI infrastructure check uses the runner's standard Python installation only to verify that `Server.xml` is well-formed.

## Product and architecture references

- [`docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`](docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md) is the authoritative state, mobile UX, plain-language, resilience, accessibility and AI-contributor quality standard.
- [`docs/PRODUCT_SPECIFICATION.md`](docs/PRODUCT_SPECIFICATION.md) defines users, authority, entities, visibility, lifecycles, MVP scope and production requirements.
- [`docs/HANDBOOK_COMPARISON.md`](docs/HANDBOOK_COMPARISON.md) records which ideas were adopted from the Echoo team handbook and which DigiStream technologies remain stronger.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) defines modular backend, data, real-time and media boundaries.
- [`docs/CREATOR_BROADCAST_STUDIO.md`](docs/CREATOR_BROADCAST_STUDIO.md) explains browser microphone publishing, go-live orchestration, creator-facing failure states and readiness verification.
- [`docs/LISTENER_PLAYBACK.md`](docs/LISTENER_PLAYBACK.md) explains public/private routes, signed playback, WebRTC-first fallback, truthful listener states and recovery.
- [`docs/LOCAL_MEDIA_STACK.md`](docs/LOCAL_MEDIA_STACK.md) explains the executable LiveKit, Egress and OvenMediaEngine development environment.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) records implementation order, reliability work and completion gates.

## Product direction

The backend-first implementation order is:

1. Production API conventions and identity model
2. Profiles and platform capabilities
3. Organisations, invitations and tenant roles
4. Channels, visibility and discovery
5. Scheduled and immediate broadcast lifecycle
6. LiveKit contribution, Egress bridge, OvenMediaEngine delivery, creator controls and listener playback
7. Reliability proof, truthful state UX and constrained-network recovery
8. Secure real-time interaction and notifications
9. Recording, object storage and replay
10. Analytics, administration and commerce
11. Deployment, monitoring, backup, rollback and recovery
