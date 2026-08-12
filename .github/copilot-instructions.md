# GitHub Copilot instructions for DigiStream

Follow root `AGENTS.md` first.

For frontend/UI/UX/design-system work, read:

1. `docs/design/DIGISTREAM_UI_V2_COMPLETE_SPEC.md`
2. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`
3. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
4. `docs/design/DESIGN_TOKENS.md`
5. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
6. `apps/web/AGENTS.md`
7. relevant reference screens for composition/journey intent

The final visual target is cream dotted DigiStream identity + dusty pink + white/warm-white operational surfaces + restrained supporting tints + Beautiful UI-quality compact component grammar + modern sans-serif typography.

Do not restore legacy dark/emerald, generic blue/white, square controls, hard shadows everywhere, monospace buttons/labels, giant repeated cards or stale Echoo branding.

User-visible branding is DigiStream.

Reuse existing routes, APIs and feature ownership. Never invent permissions, lifecycle state, recordings, readiness, analytics, listener counts or success.

Do not use broad regex/perl/sed visual replacements across unrelated frontend files. Implement shared primitives first, then migrate screens deliberately.

Do not declare the redesign complete after token changes. The component and surface completion gates in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` are mandatory.
