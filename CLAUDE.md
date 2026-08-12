# Claude instructions for DigiStream

Read root `AGENTS.md` first.

For any frontend/UI/UX/design-system work, read in this order:

1. `docs/design/DIGISTREAM_UI_V2_COMPLETE_SPEC.md`
2. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`
3. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
4. `docs/design/DESIGN_TOKENS.md`
5. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
6. `docs/design/REFERENCE_INDEX.md`
7. the relevant numbered reference screen(s) for composition/journey intent
8. `apps/web/AGENTS.md`

The current visual direction is the **cream-dotted DigiStream + Beautiful UI-quality hybrid**. Do not restore legacy dark/emerald, blue/white, square-everything, hard-shadow-everywhere, mono-button or giant-card rules.

User-visible branding is **DigiStream**, not Echoo.

Normal UI typography is modern sans-serif; mono is technical-only.

The 50-screen pack is not sole reusable styling authority. It informs screen responsibility, journey, content grouping and relative hierarchy. The current UI V2 Complete Specification controls reusable presentation.

Reuse existing routes/components/APIs. Do not duplicate Studio, Broadcasts, Recordings, Lobby/Backstage, onboarding or business logic for visual fidelity.

Never fabricate data, lifecycle state, media readiness, analytics, listener counts, progress, recording/replay availability, permissions or success.

Do not perform broad mechanical regex/perl/sed visual rewrites. Migrate shared primitives and product surfaces deliberately.

Do not declare UI V2 complete after token/foundation work. Continue until the shared component families and major surfaces in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` are implemented, responsive, accessible and validated.
