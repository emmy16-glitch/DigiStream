# DigiStream

DigiStream is an audio-first live-streaming platform for creators, organisations and listeners. It is designed as one responsive web product that works across phones, tablets and desktop computers.

## Current foundation

- Responsive React creator dashboard and listener-ready web shell
- Fastify TypeScript API with health and platform-status endpoints
- Shared TypeScript contracts
- npm workspace monorepo
- GitHub Actions validation
- Termux-friendly development commands with no Docker requirement
- GitHub Codespaces configuration with automatic dependency installation and port forwarding

## Repository structure

```text
DigiStream/
├── .devcontainer/    # Reproducible GitHub Codespaces environment
├── apps/
│   ├── api/          # Fastify API
│   └── web/          # React + Vite responsive web app
├── packages/
│   └── contracts/    # Shared API contracts
├── docs/             # Architecture, roadmap and development guides
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

## Run locally in Termux or desktop Linux

```bash
git clone https://github.com/emmy16-glitch/DigiStream.git
cd DigiStream
npm install
cp .env.example .env
```

Start the API in one terminal:

```bash
npm run dev:api
```

Start the web app in another terminal:

```bash
npm run dev:web
```

Open `http://127.0.0.1:5173` on the same device. A computer on the same local network can use the development device's local IP address instead of `127.0.0.1`.

## Run in GitHub Codespaces

Create a Codespace for the branch you want to inspect. The included development-container configuration uses Node.js 22, runs `npm install`, and forwards:

- Port `3000` for the API
- Port `5173` for the web application

Then run `npm run dev:api` and `npm run dev:web` in separate terminals. See [`docs/CODESPACES.md`](docs/CODESPACES.md) for the complete phone workflow.

## Validation

```bash
npm run check
```

This runs TypeScript checks, API tests and production builds.

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
