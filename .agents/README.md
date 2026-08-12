# DigiStream design-agent skills

This directory is DigiStream's repo-level, agent-neutral design skill registry.

## Authority and precedence

Design skills are advisory implementation aids. They never override:

1. root `AGENTS.md` for product truth, security, reliability, lifecycle, authorization and architecture;
2. `docs/design/DIGISTREAM_UI_V2_COMPLETE_SPEC.md` for complete current presentation rules;
3. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`;
4. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
5. `docs/design/DESIGN_TOKENS.md`;
6. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
7. the numbered reference pack for screen responsibility/journey/composition intent;
8. current code/contracts/routes/tests for real product responsibility.

The old dark/emerald system, old blue/white styling, square-everything rules, hard-shadow-everywhere rules, mono-button/typewriter UI and stale Echoo branding are not current visual authority.

## Current visual target

The final system is:

> cream dotted DigiStream canvas + white/warm-white operational surfaces + dusty-pink brand anchor + restrained supporting tints + Beautiful UI-quality compact component grammar + modern readable sans-serif typography.

User-visible branding is DigiStream.

## Required workflow

Before using a design skill on a screen:

1. read the complete UI V2 specification;
2. identify the existing responsible route/component/API;
3. inspect the relevant reference screen for composition/journey intent;
4. use the skill only to improve implementation quality inside those constraints;
5. preserve product truth and anti-duplication rules;
6. compare the implementation against responsive and accessibility requirements;
7. run the design review checklist/tests.

Do not use a skill to invent APIs, routes, permissions, metrics, lifecycle state, recordings, replay availability, media readiness or success.

## Installed skill adapters

- `ui-ux-pro-max` — broad UI/UX structure, accessibility, interaction, responsive and design-system guidance.
- `taste-skill` — anti-slop visual guidance only where its scope fits.
- `impeccable` — product UI critique, audit, accessibility, responsive and final-polish playbooks.
- `emil-design-eng` — component craft, interaction feedback and animation-decision guidance.

The local `SKILL.md` files are stable DigiStream adapters. Exact upstream revisions and source paths are pinned in `.agents/sources.lock.json`.

## Materializing upstream source

Run:

```bash
npm run skills:sync
```

Run `npm run skills:verify` to validate the registry.
