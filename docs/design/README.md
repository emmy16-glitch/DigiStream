# DigiStream Design Source of Truth

This directory contains the authoritative visual-design contract for the current DigiStream web product.

## Mandatory read order for UI work

1. [`DIGISTREAM_UI_CONSTITUTION.md`](DIGISTREAM_UI_CONSTITUTION.md)
2. [`DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`](DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md)
3. [`REFERENCE_INDEX.md`](REFERENCE_INDEX.md)
4. the exact numbered approved image in `reference/screens/`
5. [`DESIGN_TOKENS.md`](DESIGN_TOKENS.md)
6. [`DIGISTREAM_VISUAL_MIGRATION_PLAN.md`](DIGISTREAM_VISUAL_MIGRATION_PLAN.md) when migrating an existing surface
7. [`DESIGN_REVIEW_CHECKLIST.md`](DESIGN_REVIEW_CHECKLIST.md) before review/merge
8. product/lifecycle/quality documents referenced by root `AGENTS.md`

A CSS token starter is also available at [`digistream-design-tokens.css`](digistream-design-tokens.css). It is documentation/reference material until deliberately integrated into the existing shared design system.

## Source-of-truth split

**Visual truth:** the UI Constitution plus the approved final 50-screen DigiStream reference pack.

**Product truth:** backend/API state, authorization, lifecycle, reliability, accessibility, privacy, media readiness, and product architecture documented elsewhere in the repository.

A reference image may never justify fake metrics, impossible actions, authorization bypasses, duplicate flows, invented product data, or inaccurate live/readiness states.

## Current visual identity

DigiStream uses:

- warm cream dotted backgrounds;
- dusty-pink accents;
- near-black grotesk headings;
- mono/typewriter labels, metadata, and technical UI copy;
- square cards, inputs, tabs, and controls;
- thin visible black borders;
- hard black offset shadows with zero blur;
- generous vertical spacing;
- restrained semantic green, amber, and rose only when state requires them.

The legacy blue/white DigiStream styling, previous Echoo visual references, and previous dark/emerald visual styling are **not** the current visual target.

## Existing documents

`DIGISTREAM_PRODUCT_DESIGN_BIBLE.md` remains useful for product intent, screen responsibilities, real-state requirements, accessibility, and interaction behavior. Any old color/theme/shape guidance inside that document is superseded by `DIGISTREAM_UI_CONSTITUTION.md`.

`DESIGN_TOKENS.md` is the normalized production token contract and must remain aligned with the Constitution.

## Design change process

A material change to navigation presentation, visual identity, shared component geometry, status language, or screen hierarchy must update these documents in the same pull request.

UI pull requests should identify the reference screen numbers used and disclose any deliberate deviation.
