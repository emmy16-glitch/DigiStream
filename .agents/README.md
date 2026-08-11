# DigiStream design-agent skills

This directory is DigiStream's repo-level, agent-neutral design skill registry.

## Authority and precedence

The skills in this directory are advisory implementation aids. They never override:

1. root `AGENTS.md` for product truth, reliability, lifecycle, security, authorization, architecture and programme sequencing;
2. `docs/design/DIGISTREAM_UI_CONSTITUTION.md` for current reusable visual-system rules;
3. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md` for the Beautiful UI -> DigiStream mapping;
4. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md` for UI-agent implementation behavior;
5. `docs/design/DESIGN_TOKENS.md` for semantic colour/spacing/radius/shadow tokens;
6. `docs/design/REFERENCE_INDEX.md` and the 50-screen pack for screen responsibility, journey intent and content grouping;
7. current executable code, migrations, contracts, routes and tests where they represent real product responsibility and behavior.

External Beautiful UI reference:

`https://beautiful-ui-five.vercel.app/`

## Mandatory hybrid visual rule

Every design skill must operate inside the DigiStream system:

- preserve warm cream dotted application canvas;
- use white/warm-white/neutral operational surfaces on top;
- keep dusty pink as the principal brand accent;
- use restrained lavender/sky/mint/amber/peach supporting tints where useful;
- keep live/success/warning/danger/info semantic colours truthful;
- borrow Beautiful UI's compact navigation, row/table, search, task, loading, approval, chat, context and insight quality;
- avoid giant repeated cards and nested heavy shadows;
- preserve responsive/accessibility requirements.

The target is **DigiStream with Beautiful UI-quality component craft**, not a Beautiful UI clone and not generic SaaS.

Never use a design skill, external reference or screenshot to invent APIs, routes, metrics, listener counts, readiness, recordings, replay availability, authorization, lifecycle state or success. Preserve tenant isolation, backend authority and the existing React/Fastify/PostgreSQL/LiveKit/Egress/OME/WebSocket architecture.

## Required UI workflow

Before using any design skill on a DigiStream screen:

1. read root and nearest scoped `AGENTS.md`;
2. read the UI Constitution;
3. read `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. identify the exact Beautiful UI pattern that fits, if any;
5. inspect the live Beautiful UI reference when network access is available;
6. open the relevant numbered DigiStream reference for product composition/journey intent;
7. identify the current route/component/API responsibility;
8. search existing design-system primitives;
9. use the skill only to improve implementation quality inside those constraints;
10. run the design review checklist and relevant tests.

If network access is unavailable, use the local Beautiful UI adaptation standard rather than guessing external visuals from memory.

## Colour-role workflow

Before adding a colour, classify it as:

- canvas;
- surface;
- brand;
- supporting accent;
- semantic state.

Normally use no more than 1–2 supporting accent families in the same visible region. Supporting accent is never a substitute for lifecycle semantics.

## Installed skill adapters

- `ui-ux-pro-max` — broad UI/UX structure, accessibility, interaction, responsive and design-system guidance.
- `taste-skill` — anti-slop visual guidance only where its upstream scope fits.
- `impeccable` — product UI critique, audit, accessibility, responsive and final-polish playbooks.
- `emil-design-eng` — component craft, interaction feedback and animation-decision guidance.

The local `SKILL.md` files are stable DigiStream adapters. Exact upstream revisions and source paths are pinned in `.agents/sources.lock.json`.

## Materializing upstream source

Run:

```bash
npm run skills:sync
```

This checks out the exact pinned revisions and copies only the declared source paths into `.agents/vendor/`. The vendor directory is intentionally gitignored so upstream repositories do not become noisy product source.

Run `npm run skills:verify` to validate the registry. The dedicated design-skill workflow also materializes every pinned upstream source so stale/invalid paths cannot silently pass CI.
