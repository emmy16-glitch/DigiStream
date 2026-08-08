# DigiStream design-agent skills

This directory is DigiStream's repo-level, agent-neutral design skill registry.

## Authority and precedence

The skills in this directory are advisory implementation aids. They never override:

1. the root `AGENTS.md`;
2. current executable code, migrations, contracts, routes and tests;
3. DigiStream's authoritative product, security, lifecycle and architecture documents;
4. approved Echoo/DigiStream visual references.

Never use a design skill to invent APIs, routes, metrics, listener counts, readiness, recordings, replay availability, authorization, lifecycle state or success. Preserve tenant isolation, backend authority, truthful state and the existing React/Fastify/PostgreSQL/LiveKit/Egress/OME/WebSocket architecture.

## Installed skill adapters

- `ui-ux-pro-max` — UI/UX systems, patterns, accessibility and responsive design guidance.
- `taste-skill` — visual-quality audit, hierarchy, spacing and product-polish guidance.
- `impeccable` — design critique and focused interface-improvement playbooks.
- Emil Kowalski design-engineering skills — baseline UI, command-based UI, navigation, performant animations, realtime rendering, sound and visual effects.

The local `SKILL.md` files are stable DigiStream adapters. Exact upstream revisions are pinned in `.agents/sources.lock.json`.

## Materializing upstream source

Run:

```bash
npm run skills:sync
```

This checks out the exact pinned revisions and copies only the declared source paths into `.agents/vendor/`. The vendor directory is intentionally gitignored so upstream repositories do not become noisy product source.

Run `npm run skills:verify` to validate the registry. CI runs this through `npm run check`.
