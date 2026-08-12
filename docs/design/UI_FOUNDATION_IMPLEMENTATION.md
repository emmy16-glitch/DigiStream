# DigiStream UI Foundation Implementation

This document describes the shared web foundation implementation direction. It is subordinate to `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.

Read with:

- `DIGISTREAM_UI_CONSTITUTION.md`;
- `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
- `DESIGN_TOKENS.md`;
- `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`.

## Target

> cream dotted DigiStream shell + clean white/warm-white operational surfaces + dusty-pink brand anchor + restrained supporting tints + modern sans-serif ordinary UI + Beautiful UI-quality compact shared components.

The target is not dark/emerald, generic blue/white, square-everything, hard-shadow-everywhere, mono/typewriter ordinary UI or an all-cream poster system.

## Required foundation

- centralized `--ds-*` semantic tokens;
- cream dotted application canvas;
- white/warm-white/neutral surface hierarchy;
- dusty-pink brand tokens;
- lavender/sky/mint/amber/peach supporting accents;
- fixed semantic live/success/warning/danger/info treatment;
- Manrope/current approved modern sans ordinary UI;
- IBM Plex Mono technical-only;
- accessible focus and reduced motion;
- shared buttons/fields/status primitives;
- shared state panels;
- responsive creator/listener shells;
- compact navigation;
- record/table patterns;
- search/command foundation;
- task/readiness rows;
- confirmation/approval;
- context panels;
- trustworthy insight cards;
- shared modal/sheet behavior.

## Branding

Visible product branding is DigiStream. Do not render Echoo in shared BrandLockup/system-state components.

Internal compatibility identifiers may remain temporarily if changing them is unrelated/high-risk.

## Deliberate boundaries

This is an incremental migration, not a rewrite of lifecycle/media/authorization architecture.

Reuse existing domain code and APIs.

Do not perform broad regex/perl/sed visual replacements. Move touched surfaces toward shared tokens/primitives deliberately.

## Data honesty

Every surface displays real API/backend/browser/media evidence or an honest unavailable/empty state. Never use illustrative production values merely to match a reference/demo.

## Responsive contract

- desktop: compact creator navigation and bounded content width;
- mobile: validated mobile navigation and compact headers;
- short-height landscape: critical controls reachable;
- touch targets practical;
- virtual keyboard does not hide active input/CTA;
- browser/Android Back closes correct transient layer.

## Completion

Foundation work is only Phase 1. It is not the whole UI V2 migration.

After foundation, continue through the component/screen phases in `DIGISTREAM_VISUAL_MIGRATION_PLAN.md` and the completion gates in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.
