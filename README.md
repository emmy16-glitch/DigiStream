# DigiStream

DigiStream is an audio-first live-streaming platform for creators, organisations and listeners. It is designed as one responsive web product that works across phones, tablets and desktop computers.

## Current foundation

- Responsive React creator dashboard and listener-ready web shell
- Fastify and TypeScript API
- PostgreSQL and Drizzle typed data model
- Versioned checksum-protected SQL migrations
- Registration, login, current-user, logout and revocable database sessions
- Secure scrypt password hashing and opaque HttpOnly cookies
- Standard safe API errors and request correlation IDs
- Shared TypeScript contracts
- npm workspace monorepo with a committed dependency lock
- PostgreSQL integration tests and GitHub Actions validation on Node.js 22 and Node.js 24
- Reproducible GitHub Codespaces environment
- Termux-friendly development commands

## Repository structure

```text
DigiStream/
├── apps/
│   ├── api/          # Fastify API and PostgreSQL modules
│   └── web/          # React + Vite responsive web app
├── packages/
│   └── contracts/    # Shared API contracts
├── docs/             # Product, architecture, roadmap and development guides
├── .devcontainer/    # GitHub Codespaces environment
└── .github/workflows # Continuous integration
```

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- PostgreSQL for database-backed development and integration tests

On Termux:

```bash
pkg update
pkg install nodejs-lts git
```

PostgreSQL can run on another reachable machine or a development cloud service when a reliable local Android package is unavailable.

## Run locally

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

For browser-based development from a phone, see [`docs/CODESPACES.md`](docs/CODESPACES.md).

## Validation

```bash
npm run check
```

GitHub Actions starts PostgreSQL, applies migrations, runs integration tests, checks TypeScript and builds the API and web application on Node.js 22 and Node.js 24. The workflow also supports manual runs from the **Actions** tab.

Python is not required for the current React and Fastify applications. A separate Python 3.11/3.12 test matrix will be added only if DigiStream later gains a Python analytics, machine-learning or data-processing service.

## Product and architecture references

- [`docs/PRODUCT_SPECIFICATION.md`](docs/PRODUCT_SPECIFICATION.md) defines users, authority, entities, visibility, lifecycles, MVP scope and production requirements.
- [`docs/HANDBOOK_COMPARISON.md`](docs/HANDBOOK_COMPARISON.md) records which ideas were adopted from the Echoo team handbook and which DigiStream technologies remain stronger.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) defines modular backend, data, real-time and media boundaries.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) records implementation order and completion gates.

## Product direction

The backend-first implementation order is:

1. Production API conventions and identity model
2. Profiles and platform capabilities
3. Organisations, invitations and tenant roles
4. Channels, visibility and discovery
5. Scheduled and immediate broadcast lifecycle
6. Media adapter and live-audio proof of concept
7. Secure real-time interaction and notifications
8. Recording, object storage and replay
9. Analytics, administration and commerce
10. Deployment, monitoring, backup, rollback and recovery
