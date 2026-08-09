# DigiStream design-agent skills

This directory is DigiStream's repo-level, agent-neutral design skill registry.

## Authority and precedence

The skills in this directory are advisory implementation aids. They never override:

1. the root `AGENTS.md` for product truth, reliability, lifecycle, security, authorization, architecture, and programme sequencing;
2. `docs/design/DIGISTREAM_UI_CONSTITUTION.md` for current visual-system rules;
3. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md` for UI-agent implementation behavior;
4. the approved final 50-screen DigiStream reference pack indexed by `docs/design/REFERENCE_INDEX.md` for screen composition and visual intent;
5. current executable code, migrations, contracts, routes and tests where they represent existing responsibility and real product behavior.

The old Echoo references, old blue/white DigiStream styling, and previous dark/emerald visual direction are not the current visual target when they conflict with the UI Constitution and approved 50-screen pack.

Never use a design skill or screenshot to invent APIs, routes, metrics, listener counts, readiness, recordings, replay availability, authorization, lifecycle state or success. Preserve tenant isolation, backend authority, truthful state and the existing React/Fastify/PostgreSQL/LiveKit/Egress/OME/WebSocket architecture.

## Required UI workflow

Before using any design skill on a DigiStream screen:

1. open the relevant numbered reference image under `docs/design/reference/screens/`;
2. read the relevant Constitution sections;
3. identify the existing route/component responsibility;
4. use the skill only to improve implementation quality inside those constraints;
5. compare the result to the reference and run the design review checklist.

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
