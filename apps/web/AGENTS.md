# DigiStream web UI agent instructions

These instructions apply to all files under `apps/web/` and supplement root `AGENTS.md`.

## Mandatory visual authority

For every frontend/UI/design-system change, read and follow:

1. `../../docs/design/DIGISTREAM_UI_CONSTITUTION.md`
2. `../../docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
3. `../../docs/design/reference/REFERENCE_INDEX.md`
4. the exact numbered approved screen reference(s) under `../../docs/design/reference/screens/`
5. root `AGENTS.md` and its product-truth/lifecycle/quality documents

The approved DigiStream 50-screen reference pack supersedes old Echoo visual references, old blue/white DigiStream styling, and any earlier dark visual styling **for visual presentation**.

This does not supersede backend authority, authorization, lifecycle truth, media readiness, product reliability, accessibility, or anti-duplication requirements in root `AGENTS.md`.

## Never silently restyle the product

Do not introduce generic SaaS styling. In particular, do not replace the approved system with rounded cards, soft blurred shadows, brand blue, glass panels, arbitrary gradients, or Inter-everywhere typography.

The required visual signature is:

- cream dotted background;
- dusty pink accents;
- bold near-black grotesk headings;
- mono/typewriter labels and metadata;
- square cards and controls;
- thin black borders;
- hard black offset shadows;
- generous vertical spacing;
- restrained semantic colors.

## Reference-image rule

Reference images control layout/composition intent. The UI Constitution controls reusable tokens and component grammar. Backend/product documents control truth and allowed behavior.

Do not hardcode fake screenshot data. Do not create a second implementation of an existing page merely to match a reference. Realign the existing surface.

## PR expectation

Any UI PR must identify the reference screen numbers it implements or realigns and must state any deliberate deviation from those references. Unexplained visual drift is a defect.
