# DigiStream architecture

## Goal

Build one responsive audio-streaming platform that can be developed from Termux while remaining suitable for desktop and mobile users in production.

## Applications

### Web application

`apps/web` contains the creator and listener web experiences. The layout is responsive rather than device-specific:

- Desktop: persistent navigation, multi-column dashboard and wide monitoring panels
- Tablet: compact navigation and two-column content where space permits
- Mobile: touch-friendly controls, stacked cards and bottom navigation

The same routes and business rules are used at every viewport size.

### API

`apps/api` is a lightweight Fastify service. It will own:

- authentication and sessions
- organisations, memberships and roles
- channels and broadcast events
- stream-session state
- chat and reactions
- recording metadata
- analytics ingestion

### Shared contracts

`packages/contracts` contains the request and response shapes shared by the web application and API.

## Planned data services

Development begins without Docker so that the repository is convenient in Termux. PostgreSQL and Redis will be introduced behind environment variables when their features are needed.

- PostgreSQL: durable application data
- Redis: presence, queues, rate limits and temporary live-session state
- Object storage: recordings, artwork and uploaded documents
- Media server: WebRTC contribution and scalable listener delivery

## Streaming strategy

The product API is separate from the media path. DigiStream will eventually use:

1. WebRTC for creator contribution and interactive sessions
2. HLS or low-latency HLS for larger listener audiences
3. Server-side recording and replay processing

This separation prevents the normal application API from becoming the audio transport server.

## Engineering principles

- Responsive by default, never mobile-only
- Accessible keyboard and touch interactions
- Multi-tenant organisation boundaries
- Secure defaults and least-privilege roles
- Observable stream health
- Incremental implementation with tests at each slice
- Local Termux development without preventing later cloud deployment
