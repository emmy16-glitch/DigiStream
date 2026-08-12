# DigiStream Design Source of Truth

This directory contains the current reusable visual-design contract for DigiStream.

## Mandatory read order for UI work

1. [`DIGISTREAM_UI_V2_COMPLETE_SPEC.md`](DIGISTREAM_UI_V2_COMPLETE_SPEC.md)
2. [`DIGISTREAM_UI_CONSTITUTION.md`](DIGISTREAM_UI_CONSTITUTION.md)
3. [`BEAUTIFUL_UI_ADAPTATION_STANDARD.md`](BEAUTIFUL_UI_ADAPTATION_STANDARD.md)
4. [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md)
5. [`DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`](DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md)
6. [`REFERENCE_INDEX.md`](REFERENCE_INDEX.md)
7. the relevant numbered screen in `reference/screens/` for composition/journey intent
8. [`DIGISTREAM_VISUAL_MIGRATION_PLAN.md`](DIGISTREAM_VISUAL_MIGRATION_PLAN.md)
9. [`DESIGN_REVIEW_CHECKLIST.md`](DESIGN_REVIEW_CHECKLIST.md)
10. product/lifecycle/reliability docs referenced by root `AGENTS.md`

External Beautiful UI reference:

`https://beautiful-ui-five.vercel.app/`

Beautiful UI is an interface-grammar reference, not a theme or product specification.

## Current visual direction

**Keep DigiStream's warm cream dotted application canvas; use clean white/warm-white/neutral operational surfaces; keep dusty pink as the principal brand accent; use restrained supporting lavender/sky/mint/amber/peach tints; use modern sans-serif ordinary UI; reserve mono for technical metadata; and adapt Beautiful UI's compact navigation, rows/tables, search, task, loading, approval, chat, context and insight patterns where they fit real product responsibilities.**

## Current branding

Visible product branding is **DigiStream**.

`Echoo` is not current visible branding. Internal compatibility names may remain temporarily when safe migration requires it.

## Explicitly obsolete visual rules

Do not use legacy instructions that require:

- dark/emerald default theme;
- generic blue/white UI;
- square cards/controls everywhere;
- hard black offset shadows everywhere;
- monospace/typewriter buttons/nav/forms/marketing/footer;
- giant cream/pink card stacks;
- 20–28px radius everywhere.

`DIGISTREAM_PRODUCT_DESIGN_BIBLE.md` is retained only as a legacy marker and is not current visual authority.

## Source-of-truth split

### Product truth

Backend/API state, authorization, tenant isolation, lifecycle, privacy, reliability, media readiness, recording/replay availability and accessibility remain authoritative.

### Reusable visual truth

`DIGISTREAM_UI_V2_COMPLETE_SPEC.md` + the current Constitution/Beautiful UI/tokens define reusable presentation.

### Screen/journey reference

The 50-screen pack informs:

- screen responsibility;
- journey intent;
- information grouping;
- relative hierarchy;
- examples of what belongs together.

It does not override the current typography, landing/footer, table/row, component-density, radius, shadow or branding rules.

## Design change process

A material change to navigation, typography, cream-canvas identity, branding, palette, shared component geometry, lifecycle/status language, landing/footer composition, table behavior, loading/progress treatment or accessibility interaction must update the relevant current design documents in the same work.

Before declaring a UI migration complete, use `DESIGN_REVIEW_CHECKLIST.md` and the completion gates in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.
