# DigiStream

DigiStream is an audio-first live-streaming platform for creators, organisations and listeners. It is designed as one responsive web product that works across phones, tablets and desktop computers.

## Current foundation

- Responsive React creator dashboard and listener-ready web shell
- Fastify TypeScript API with health and platform-status endpoints
- Shared TypeScript contracts
- npm workspace monorepo
- GitHub Actions validation on Node.js 22 and Node.js 24
- Reproducible GitHub Codespaces environment
- Termux-friendly development commands with no Docker requirement

## Repository structure

```text
DigiStream/
├── apps/
│   ├── api/          # Fastify API
│   └── web/          # React + Vite responsive web app
├── packages/
│   └── contracts/    # Shared API contracts
├── docs/             # Architecture, roadmap and development guides
├── .devcontainer/    # GitHub Codespaces environment
└── .github/workflows # Continuous integration
```

## Requirements

- Node.js 22 or newer
- npm 10 or newer

On Termux:

```bash
pkg update
pkg install nodejs-lts git
```

## Run locally

```bash
git clone https://github.com/emmy16-glitch/DigiStream.git
cd DigiStream
npm install
cp .env.example .env
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

GitHub Actions runs the same validation automatically on Node.js 22 and Node.js 24. The workflow also supports manual runs from the **Actions** tab.

Python is not required for the current React and Fastify applications. A separate Python 3.11/3.12 test matrix will be added only if DigiStream later gains a Python analytics, machine-learning or data-processing service.

## Product direction

The first product slice will cover:

1. Accounts and authentication
2. Organisations and team roles
3. Channels and scheduled broadcasts
4. Creator audio setup and go-live workflow
5. Listener playback pages
6. Live chat and reactions
7. Recordings and replay publishing
8. Analytics and stream-health monitoring

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for implementation order.
