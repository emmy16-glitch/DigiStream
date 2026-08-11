# DigiStream UI Foundation Implementation

This document describes the shared web foundation that implementation agents should converge toward. It must be read together with:

- `DIGISTREAM_UI_CONSTITUTION.md`;
- `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
- `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
- `DESIGN_TOKENS.md`.

The current target is **not a dark theme** and not an all-cream poster system. The target is the hybrid system:

> cream dotted DigiStream shell + clean white/neutral operational surfaces + dusty-pink brand anchor + restrained supporting colour tints + Beautiful UI-quality compact component patterns.

## Included in the foundation direction

- centralized `--ds-*` semantic tokens;
- cream dotted application canvas;
- white/warm-white/neutral operational surface hierarchy;
- dusty-pink brand tokens;
- restrained lavender/sky/mint/amber/peach supporting accents;
- fixed semantic live/success/warning/danger/info treatment;
- accessible global focus, reduced-motion and skip-link behaviour;
- central button, link-button and icon-button components;
- status badges/dots that combine text/shape/icon with colour;
- reusable loading, empty, error, offline and unauthorized state patterns;
- responsive creator/listener shells;
- compact creator navigation;
- row/table patterns for repeated records;
- responsive mobile record transformation;
- search/command interface foundation when implemented;
- task/readiness rows;
- confirmation/approval patterns;
- context panels;
- insight cards only for trustworthy analytics;
- shared modal/sheet focus/Back/scroll-lock behavior.

## Migration progress interpretation

Previous migration checklists may describe dark or legacy visual slices. Treat those historical statements as implementation history, not current visual authority.

Current migration priorities are defined in `DIGISTREAM_VISUAL_MIGRATION_PLAN.md`.

## Deliberate boundaries

This remains an incremental migration rather than a rewrite.

Existing feature CSS may remain temporarily where replacing it would create excessive risk, but every touched surface should move toward shared tokens/primitives when the change is bounded and testable.

Do not rewrite unrelated media, lifecycle, authorization or data code merely to implement a visual change.

## Data honesty

Every later migration must display:

- real backend/API data;
- a clearly labelled estimate only when the product explicitly supports estimates;
- or an honest unavailable/empty state.

Never display illustrative production values merely to match a screenshot or Beautiful UI demo.

## Responsive contract

- Desktop: persistent compact creator navigation where appropriate and a content workspace that does not over-expand text.
- Tablet: compact navigation/rail or responsive shell according to validated product behavior.
- Mobile: validated creator mobile navigation, compact page header and horizontally safe content.
- Short-height landscape: critical operational controls remain reachable.
- Minimum usable touch target: approximately 44px for mobile-critical interactions.
- Virtual keyboard: active input/composer/primary action remains reachable.
- Browser/Android Back: closes the correct top transient layer before route navigation.

## Beautiful UI pattern ownership

The foundation should enable reusable equivalents of:

- Sidebar/NavItem;
- SearchField/CommandSearch;
- TaskRow/TaskList;
- DataTable/ResponsiveRecordRow;
- FilterTabs;
- LoadingState;
- Approval/ConfirmationDialog;
- ContextPanel;
- InsightCard;
- MessageRow/Composer;
- SelectionBar.

Feature folders compose these primitives using real domain state.

## Colour contract

The foundation must keep the following separation clear:

- cream dotted canvas = DigiStream identity;
- white/neutral surface = operational clarity;
- dusty pink = principal brand accent;
- lavender/sky/mint/amber/peach = optional supporting grouping accents;
- live/success/warning/danger/info = semantic product state.

A supporting colour never becomes a lifecycle shortcut.

## Elevation contract

- table/list rows: border/divider, usually no shadow;
- ordinary card/panel: no shadow or subtle shadow;
- dropdown/search palette: modest floating shadow;
- modal/sheet: stronger soft shadow where needed;
- hard-offset shadow: rare brand/hero accent only, not ordinary operational elevation.

## Pull-request review evidence

Every later UI migration should include:

- surface(s) changed;
- relevant Beautiful UI pattern(s) adapted;
- relevant DigiStream reference screen(s) used for product composition/journey intent;
- shared primitives changed/created;
- cream/dotted shell treatment;
- supporting accent colours used and why;
- mobile/table transformation where applicable;
- loading/empty/failure evidence;
- keyboard/focus/Back behavior;
- confirmation that each displayed value is real or explicitly unavailable;
- tests run/results.
