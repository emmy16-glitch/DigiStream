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

- `ui-ux-pro-max` — broad UI/UX structure, accessibility, interaction, responsive and design-system guidance.
- `taste-skill` — anti-slop visual guidance only where its upstream scope fits; it explicitly does not cover dashboards, data tables or multi-step product UI.
- `impeccable` — product UI critique, audit, accessibility, responsive and final-polish playbooks.
- `emil-design-eng` — Emil Kowalski's component craft, interaction feedback and animation-decision guidance.

The local `SKILL.md` files are stable DigiStream adapters. Exact upstream revisions and source paths are pinned in `.agents/sources.lock.json`.

## Materializing upstream source

Run:

```bash
npm run skills:sync
```

This checks out the exact pinned revisions and copies only the declared source paths into `.agents/vendor/`. The vendor directory is intentionally gitignored so upstream repositories do not become noisy product source.

Run `npm run skills:verify` to validate the registry. The dedicated design-skill workflow additionally materializes every pinned upstream source so a stale or invalid path cannot silently pass CI.
