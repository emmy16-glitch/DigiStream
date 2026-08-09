# Claude instructions for DigiStream

Read root `AGENTS.md` first; it remains authoritative for product truth, lifecycle behavior, reliability, security, authorization, anti-duplication rules, and programme sequencing. Then read `.agents/README.md`.

## Mandatory UI/design authority

Before any work involving frontend UI, UX, styling, responsive behavior, navigation presentation, component design, authentication screens, creator surfaces, listener surfaces, Studio, Backstage, Recordings, analytics, settings, modals, or visual polish, also read:

1. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`
2. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
3. `docs/design/reference/REFERENCE_INDEX.md`
4. the exact approved reference image(s) under `docs/design/reference/screens/`
5. `apps/web/AGENTS.md`

The **approved final 50-screen DigiStream reference pack** is the current visual source of truth. It supersedes old Echoo visual references, the legacy blue/white DigiStream interface, and earlier dark-theme visual direction for presentation decisions.

Do not interpret that as permission to fake data or bypass product architecture. Backend authorization, truthful lifecycle/media state, accessibility, real API state, and root `AGENTS.md` product requirements remain mandatory.

For design, UI, UX, animation, navigation or visual-polish work, use the relevant repo-level adapter in `.agents/skills/` where useful. Exact upstream revisions are pinned in `.agents/sources.lock.json`; run `npm run skills:sync` only when the full upstream playbook or supporting files are needed.

Design skills are advisory. They do not override the DigiStream UI Constitution, the approved 50-screen reference pack, current code responsibilities, authorization, tenant isolation, truthful lifecycle/media state, accessibility requirements, or DigiStream architecture.

If you have not opened the relevant reference image before changing a screen, you are not ready to implement that screen.
