# GitHub Copilot instructions for DigiStream

Follow root `AGENTS.md` as the primary repository instruction file, then `.agents/README.md`.

For design/UI/UX work, consult the relevant `.agents/skills/*/SKILL.md` adapter. Full pinned upstream sources can be materialized locally with `npm run skills:sync`.

Do not use generic design guidance to invent routes, APIs, permissions, metrics, lifecycle state, recordings, readiness or success. Reuse the current responsible component and preserve DigiStream's architecture, approved Echoo references, accessibility and responsive requirements.
