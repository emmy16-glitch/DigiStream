# Claude instructions for DigiStream

Read root `AGENTS.md` first; it is authoritative. Then read `.agents/README.md`.

For design, UI, UX, animation, navigation or visual-polish work, use the relevant repo-level adapter in `.agents/skills/`. Exact upstream revisions are pinned in `.agents/sources.lock.json`; run `npm run skills:sync` only when the full upstream playbook or supporting files are needed.

Design skills are advisory. They never override current code, authorization, tenant isolation, truthful lifecycle/media state, approved Echoo references, accessibility requirements or DigiStream architecture.
