# Design-agent skill integration

DigiStream exposes a repo-level design skill registry under `.agents/skills/` so coding agents can use the same design-engineering guidance without tying the project to one assistant product.

## What is installed

The registry contains stable DigiStream adapters for UI UX Pro Max, Taste Skill, Impeccable and all seven skills in Emil Kowalski's current `skills/` repository. Exact upstream revisions are locked in `.agents/sources.lock.json`.

The upstream repositories are not copied permanently into application source. `npm run skills:sync` materializes the exact pinned source into the gitignored `.agents/vendor/` directory. This keeps the product repository small while preserving reproducibility and access to supporting scripts/reference files.

## Usage

1. Read root `AGENTS.md` and the authoritative DigiStream documents before using any design skill.
2. Pick the smallest relevant `.agents/skills/*/SKILL.md` adapter.
3. Run `npm run skills:sync` when the full upstream playbook or supporting assets are needed.
4. Apply recommendations only after inspecting the current route/component/API/tests and approved visual reference.
5. Run the existing complete validation path. The skill layer is not a substitute for tests, authorization review, media validation or responsive acceptance.

## Safety boundaries

Design guidance must not create a parallel architecture or fake product state. It must not invent analytics, counts, readiness, recordings, success, lifecycle state, permissions, media evidence or replay availability. It must preserve current backend authority, tenant isolation, accessibility, reduced-motion behavior and the existing DigiStream media architecture.

No third-party skill package is imported into the production web/API bundle.
