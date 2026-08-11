# DigiStream Design Source of Truth

This directory contains the authoritative visual-design contract for the DigiStream web product.

## Mandatory read order for UI work

1. [`DIGISTREAM_UI_CONSTITUTION.md`](DIGISTREAM_UI_CONSTITUTION.md)
2. [`BEAUTIFUL_UI_ADAPTATION_STANDARD.md`](BEAUTIFUL_UI_ADAPTATION_STANDARD.md)
3. [`DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`](DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md)
4. [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md)
5. [`REFERENCE_INDEX.md`](REFERENCE_INDEX.md)
6. the exact relevant numbered image in `reference/screens/` for product composition/journey intent
7. [`DIGISTREAM_VISUAL_MIGRATION_PLAN.md`](DIGISTREAM_VISUAL_MIGRATION_PLAN.md) when migrating an existing surface
8. [`DESIGN_REVIEW_CHECKLIST.md`](DESIGN_REVIEW_CHECKLIST.md) before review/merge
9. product/lifecycle/quality documents referenced by root `AGENTS.md`

External Beautiful UI reference:

`https://beautiful-ui-five.vercel.app/`

Agents should open the live reference when network access is available. When it is unavailable, `BEAUTIFUL_UI_ADAPTATION_STANDARD.md` is the canonical local description of how the reference maps to DigiStream.

## The visual rule in one sentence

**Keep DigiStream's warm cream dotted application canvas; place clean white/neutral operational surfaces on top of it; keep dusty pink as the main brand accent; borrow Beautiful UI's compact density, rows/tables, search, loading, task, approval, chat and insight patterns; and use restrained lavender/sky/mint/amber/peach supporting tints without confusing them with semantic lifecycle colours.**

## Source-of-truth split

### Product truth

Backend/API state, authorization, tenant isolation, lifecycle, privacy, reliability, media readiness, recording/replay availability and accessibility remain authoritative.

A design reference may never justify fake metrics, impossible actions, authorization bypass, invented product data or inaccurate live/readiness state.

### Reusable visual truth

The UI Constitution plus the Beautiful UI Adaptation Standard define reusable presentation rules.

### Screen/journey reference

The 50-screen pack remains useful for:

- screen responsibility;
- journey intent;
- information grouping;
- relative hierarchy;
- examples of what belongs together.

It must not be followed blindly where the v2.1 Constitution intentionally improves density, table treatment, inner surface colour, radius, shadow usage or navigation presentation.

## Current visual identity

DigiStream uses a hybrid system:

- warm cream dotted application canvas;
- white/warm-white/neutral operational surfaces;
- dusty-pink primary brand accent;
- near-black primary text;
- restrained supporting lavender/sky/mint/amber/peach tints;
- fixed semantic live/success/warning/danger/info treatments;
- compact navigation and row hierarchy;
- tables/rows for repeated structured data;
- restrained 6–10px radius on ordinary controls/panels;
- subtle borders and minimal shadow inside dense screens;
- rare hard-offset shadow only as an intentional brand/hero accent;
- accessible responsive behavior.

The product should feel like **DigiStream using Beautiful UI-quality interface grammar**, not Beautiful UI with a DigiStream logo and not the older oversized cream-card implementation.

## Design change process

A material change to navigation, cream-canvas identity, brand/supporting palette, shared component geometry, lifecycle/status language, screen hierarchy, table behavior, loading/progress treatment or accessibility interaction must update the relevant design documents in the same pull request.

UI pull requests should state:

- surface(s) changed;
- Beautiful UI pattern(s) adapted;
- shared primitives changed/created;
- cream/dotted shell treatment;
- supporting accent colours used and why;
- deliberate deviations from the 50-screen references;
- responsive/accessibility evidence;
- tests run.
