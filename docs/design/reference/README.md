# Approved DigiStream Visual References

This directory is the visual source-of-truth area for the current DigiStream redesign.

## Contents

- `../REFERENCE_INDEX.md` — numbered map of all 50 approved screens.
- `MANIFEST.md` — approved filenames, sizes, and SHA-256 checksums.
- `screens/01_creator_overview.png` through `screens/50_creator_analytics_dashboard.png` — expected original reference images.

## How coding agents must use these files

Do not treat the images as loose inspiration. Open the exact screen reference before implementing or realigning a page.

Use:

- the image for composition, hierarchy, density, and screen intent;
- `../DIGISTREAM_UI_CONSTITUTION.md` for reusable visual rules;
- `../DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md` for agent behavior;
- `../DESIGN_TOKENS.md` for normalized production values;
- root product documents for backend truth, lifecycle, authorization, reliability, and accessibility.

## Legacy visual styles are rejected

Do not use the original blue/white reference pack as a styling source. Do not use the previous dark/emerald design as the application target. Do not introduce a generic rounded SaaS design.

## Integrity

`MANIFEST.md` contains the SHA-256 digest for each approved source image. If a reference asset changes, update the manifest deliberately and explain the design change.
