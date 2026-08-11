# DigiStream Design System / UI Constitution

Version 2.1 — **cream-dotted DigiStream identity + Beautiful UI-quality operational interface**

## 0. Purpose and authority

This document is the reusable visual and interaction contract for DigiStream.

Product truth is always more authoritative than presentation. Authorization, tenant isolation, lifecycle, media readiness, recording/replay availability, privacy, reliability and accessibility must never be fabricated or weakened for visual fidelity.

For frontend presentation use this order:

1. root product/quality/lifecycle requirements referenced by `AGENTS.md`;
2. this Constitution;
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
5. feature-specific product documents;
6. the 50-screen reference pack for product responsibility, journey, information grouping and relative hierarchy;
7. implementation details that do not conflict with the above.

The intended visual language is:

> **warm cream dotted DigiStream canvas + clean white/neutral operational surfaces + dusty-pink brand anchor + restrained supporting colour tints + compact Beautiful UI-like component hierarchy.**

Never interpret Beautiful UI as permission to erase DigiStream's cream dotted identity.

Never interpret the old reference pack as permission to make every surface a huge cream/pink card with heavy shadow.

---

## 1. Non-negotiable visual and product principles

1. **Cream dotted canvas remains a DigiStream brand signature.**
2. **Dusty pink remains the primary brand accent.**
3. **Inner operational surfaces may be white, warm white, neutral gray or restrained pale accent tints.**
4. **Near-black text carries primary hierarchy.**
5. **Beautiful UI-like density is preferred over giant repeated cards.**
6. **Tables/rows are preferred for repeated comparable records.**
7. **Cards are used for meaningful grouping, not as the default wrapper for everything.**
8. **One contextual primary action per state.**
9. **Status, progress and analytics are evidence-backed.**
10. **Semantic state colours never get replaced by decorative colour choices.**
11. **Borders and spacing do more structural work than shadows.**
12. **Hard offset shadows are optional signature accents, not an application-wide requirement.**
13. **Responsive and accessibility behavior are part of the design, not cleanup after desktop implementation.**
14. **Existing product responsibilities are realigned, not duplicated.**
15. **External design references are adapted, not cloned.**

---

## 2. Application layering model

Every agent should think about DigiStream in four visual layers.

### Layer 1 — Brand canvas

Warm cream with subtle dots.

```css
.ds-app-background {
  background-color: #F7F3EE;
  background-image:
    radial-gradient(circle, rgba(31, 32, 37, 0.09) 1px, transparent 1.1px);
  background-size: 20px 20px;
}
```

Rules:

- dot opacity remains subtle;
- do not remove the pattern on ordinary application pages merely to make implementation easier;
- large operational surfaces may cover the dots with a solid inner panel;
- outer shell/gutters/header context should preserve enough cream that the product still reads as DigiStream;
- modal overlays may visually suppress the pattern temporarily;
- on mobile, dot opacity may be reduced slightly to avoid visual noise;
- do not switch to a generic blue-gray SaaS page background.

### Layer 2 — Operational surfaces

Use white, warm white and soft neutral surfaces to create calm contrast against cream.

Examples:

- tables;
- search palette;
- form panels;
- Studio control surfaces;
- settings sections;
- chat panel;
- recording rows;
- analytics cards.

Dense operational screens can use large solid white/near-white workspace panels so the cream grid remains an outer brand canvas rather than background noise behind every control.

### Layer 3 — Brand and supporting accents

Dusty pink remains the primary brand anchor.

Supporting accent families may include restrained:

- lavender;
- sky blue;
- mint;
- amber;
- peach/rose.

These colours are for visual grouping, optional card tinting, icon tiles, secondary data series, selected subtleties and information categorization.

They are **not lifecycle states**.

### Layer 4 — Semantic state

Use dedicated semantic treatments for:

- live;
- success/ready/healthy;
- warning/reconnecting/degraded;
- danger/failed/destructive;
- informational state.

Decorative accent colour must never override semantic meaning.

---

## 3. Core colour contract

Production values are centralized in `DESIGN_TOKENS.md`.

Conceptual roles:

### Foundation

- cream background;
- subtle dot ink;
- white/warm-white surface;
- soft neutral surface;
- near-black primary text;
- medium neutral secondary text;
- light neutral border;
- stronger neutral selected/focus boundary.

### Brand

Dusty pink is the principal brand accent.

Use it for:

- primary brand action where appropriate;
- active navigation punctuation;
- occasional key highlight;
- important non-semantic emphasis;
- chart primary series where suitable;
- small icon/surface tint.

Avoid full-page pink washes.

### Supporting accent discipline

Normally show at most one or two supporting accent families in the same visible screen region, in addition to dusty pink and semantic colours.

Do not create a rainbow dashboard.

### Semantic discipline

- green does not automatically mean primary action;
- amber does not mean decorative warmth if the same visual treatment is used for warning;
- live gets a stable live treatment;
- status meaning survives without colour.

---

## 4. Typography

The UI should be readable before it is expressive.

Use:

- a primary sans-serif for headings, body, controls and navigation;
- monospace selectively for technical metadata, IDs, diagnostics, timestamps or code-like information.

Rules:

- ordinary paragraphs should not all be monospace;
- operational creator pages should avoid huge marketing-scale headings;
- headings use size/weight/spacing for hierarchy;
- labels are concise;
- long names and descriptions wrap or truncate intentionally;
- do not shrink text into unreadability to fit narrow widths.

Suggested hierarchy:

| Role | Mobile | Desktop | Typical weight |
|---|---:|---:|---:|
| Page title | 28–32px | 30–36px | 650–750 |
| Section title | 20–24px | 22–26px | 600–700 |
| Row/card title | 15–17px | 15–18px | 550–650 |
| Body | 14–16px | 14–16px | 400–500 |
| Metadata | 12–14px | 12–14px | 400–500 |
| Button/label | 13–15px | 13–15px | 550–650 |

---

## 5. Spacing and density

Use a strict shared spacing scale.

```text
4 8 12 16 20 24 32 40 48 64
```

Recommended roles:

- page padding: 16–24px mobile, 24–40px desktop;
- major section gap: 24–40px;
- panel padding: 16–24px;
- compact row vertical padding: 10–14px;
- related controls: 8–12px;
- unrelated groups: 20–32px.

Density rules:

- repeated records should become rows/tables before they become giant cards;
- mobile density must not reduce touch target accessibility;
- desktop density must not create excessively wide text lines;
- avoid repeated wrapper cards, duplicate headings and redundant status blocks;
- the main action should not be pushed far below the fold by decorative content;
- use progressive disclosure for technical detail.

---

## 6. Borders, radius and elevation

### Borders

Use light neutral borders for ordinary structure. Use stronger contrast for selected, focused or high-importance state.

### Radius

Use restrained radius, generally 6–10px for normal controls/panels.

- small chip/badge may be pill-like;
- avatar is circular;
- media artwork may follow a controlled feature-specific radius.

Avoid 20–28px radius on every application surface.

### Elevation

Preferred hierarchy:

- table/list row: divider/border only;
- ordinary card/panel: no shadow or subtle shadow;
- dropdown/command search: modest floating shadow;
- modal/sheet: stronger soft elevation;
- rare brand/marketing hero: optional DigiStream hard-offset shadow if intentionally chosen.

Do **not** restore hard black offset shadow on every operational surface.

No glassmorphism, permanent neon glow or nested shadow stacks.

---

## 7. Component-choice constitution

Use **rows/tables** when the user needs to compare multiple similar records.

Use **cards** when information forms one meaningful contained context or decision.

Use **task rows** for real staged work/readiness.

Use **loading states** for genuine asynchronous waiting.

Use **approval/confirmation UI** for consequential actions.

Use **insight cards** only for trustworthy analytics.

Use **context panels** for supporting selected-resource information.

Use **badges/chips** for compact semantic or categorical information.

Use **search/command search** only when results and actions are real and authorized.

---

## 8. Required shared component direction

The shared design system should converge on reusable equivalents of:

- Button;
- IconButton;
- Badge / StatusBadge / StatusDot;
- PageHeader;
- SectionHeader;
- Sidebar / NavItem;
- SearchField;
- CommandSearch;
- FilterTabs;
- DataTable;
- ResponsiveRecordRow;
- TaskRow / TaskList;
- LoadingState;
- EmptyState;
- ErrorState;
- ContextPanel;
- ConfirmationDialog / ApprovalCard;
- InsightCard;
- MessageRow;
- Composer;
- SelectionBar;
- Toolbar;
- Modal/Sheet primitives.

Reuse existing equivalents before creating a duplicate component with a new name.

Feature components own domain composition. Generic design-system components do not own authorization/lifecycle/media truth.

---

## 9. Navigation constitution

### Creator desktop

Adapt Beautiful UI's Sidebar Nav quality:

- compact rows;
- section labels;
- quick search where useful;
- small counts/badges;
- clear selected state;
- workspace/account context.

Possible real structure:

```text
WORKSPACE
Overview
Broadcasts
Studio
Recordings
Analytics          # only when real and enabled

AUDIENCE / PRODUCTION
Studio Lobby       # when applicable
Chat               # when distinct
Guests             # when applicable

ACCOUNT
Account
Settings
```

Rules:

- do not create routes solely to satisfy this example;
- active row may use warm-white/soft accent surface with dusty-pink punctuation;
- navigation itself should not look like a stack of cards;
- workspace switcher derives from real membership state;
- stable vocabulary is mandatory.

### Mobile

Use validated mobile navigation rather than squeezing the desktop sidebar onto a phone.

Preserve:

- main-task discoverability;
- account access;
- safe areas;
- keyboard behavior;
- browser/Android Back semantics;
- no action covered by fixed navigation.

---

## 10. Page header and section rules

A standard page header contains only what is needed:

- title;
- optional short explanation;
- optional primary action;
- optional compact contextual controls.

Do not repeat the same title inside the first card.

Use spacing, dividers and section headings before inventing another wrapper card.

---

## 11. Creator Overview

Overview answers immediately:

1. What is happening now?
2. What should I do next?
3. What is blocked or recovering?

Preferred order:

1. page header;
2. one contextual primary action;
3. current/live/recovering broadcast context;
4. next scheduled/draft item;
5. task/readiness rows if work is in progress;
6. recent broadcasts/recordings as compact rows;
7. trustworthy analytics insight only when available;
8. lower-priority actions.

The cream dotted canvas remains visible around the Overview composition. Inner surfaces may be white, warm white or pale accent tints.

Overview must not become a generic KPI-card gallery.

---

## 12. Broadcasts and repeated records

Broadcasts should normally use:

- header + create action;
- lifecycle filter tabs/chips;
- compact records table/rows;
- lifecycle-specific row action;
- clear empty state.

Candidate columns:

- broadcast title;
- channel;
- scheduled/started/completed time;
- status;
- relevant audience/recording context only when real;
- contextual action.

Mobile transforms table rows into compact stacked record rows.

Avoid a giant separate card for every broadcast when users need to compare them.

---

## 13. Studio

Studio is operational software. Calmness and state clarity beat decoration.

The outer product shell may retain cream/dots while the main Studio work area becomes a large solid neutral/white panel to reduce visual noise.

Primary hierarchy:

- selected organization/channel/broadcast;
- microphone/device state;
- private contribution state;
- public delivery state;
- live state and elapsed time when real;
- one critical primary action;
- bounded recovery;
- secondary diagnostics.

Rules:

- critical controls remain stable;
- live UI becomes calmer rather than more animated;
- reconnecting clearly separates what remains healthy from what is degraded;
- technical provider detail is progressively disclosed;
- destructive/end action is protected from accidental activation;
- short-height/mobile layouts preserve current state and critical controls.

---

## 14. Studio Lobby, Chat and Guests

Use Beautiful UI-like compact communication hierarchy while preserving human chat semantics.

- clear sender/body/time hierarchy;
- compact message rows;
- composer remains reachable with keyboard open;
- moderation actions are secondary until needed;
- guest readiness/status uses compact rows;
- role permissions remain API-backed;
- do not insert AI reasoning traces into normal human conversation UI.

Pale supporting colours may distinguish tabs/context groups, but semantic status remains fixed.

---

## 15. Recordings

Prefer searchable/filterable rows with:

- title;
- broadcast/channel context;
- duration when known;
- created/completed time;
- processing state;
- publish/replay state;
- contextual actions.

Recording processing should use truthful task/loading patterns.

A completed broadcast does not automatically mean the recording is ready.

---

## 16. Analytics and insight cards

Analytics is only shown when trustworthy data exists.

Every metric needs:

- data source;
- authorized scope;
- time range;
- unit;
- unavailable/partial-state behavior;
- consistent comparison basis when showing change.

Beautiful UI-like mixed colour can be used carefully:

- dusty pink = primary brand/data series;
- lavender/sky = secondary comparison/category series;
- mint/amber = supporting series only if they cannot be mistaken for semantic success/warning;
- semantic colour = actual state only.

Do not invent listener counts, growth, retention, confidence or health scores.

---

## 17. Search and command interface

A command/search interface may provide:

- authorized resource search;
- route navigation;
- safe quick actions;
- workspace switching.

Rules:

- keyboard complete;
- live filtering;
- clear selected item;
- understandable empty state;
- authorized results only;
- no duplicate routing/business logic;
- suggested actions reflect current user permissions/state.

---

## 18. Task rows, loading and progress

Use task rows for genuine multi-stage work.

Use loading states for genuine asynchronous wait.

Use determinate progress only when progress is measurable.

Never:

- fabricate a percentage;
- fabricate a stage sequence;
- imply public delivery from microphone/private Studio state;
- animate scheduled waiting content as active work;
- show success before authoritative confirmation;
- shift button width/layout while loading.

Failures should expose a bounded real recovery action where one exists.

---

## 19. Confirmation and approval

For consequential actions, use specific consequence-oriented copy.

Examples:

- `End broadcast`;
- `Delete recording`;
- `Suspend user`;
- `Remove participant`;
- `Revoke session`.

A confirmation contains:

- specific title;
- short factual consequence;
- safe action;
- explicit consequential action.

Do not use vague `Are you sure?` + `Yes` unless there is no clearer wording possible.

Server authorization remains mandatory.

---

## 20. Motion

Follow `PREMIUM_INTERACTION_MOTION_AND_PRODUCT_POLISH.md` for full authority.

Constitution rules:

- motion explains state/continuity;
- input acknowledgement is immediate;
- success waits for real confirmation;
- transitions are short/restrained;
- reduced motion is complete;
- no continuous decorative particles/parallax/glow;
- scheduled content does not pulse;
- live/reconnecting movement maps to real state.

---

## 21. Responsive and accessibility requirements

Validate applicable changes at:

- small Android portrait;
- large phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation when CI requires it;
- 200% zoom where acceptance tests cover it.

Required:

- no ordinary horizontal overflow;
- readable text without forced shrinking;
- usable touch targets;
- obvious focus-visible;
- keyboard/touch/mouse parity;
- correct dialog/sheet focus trap/restoration;
- Escape and browser/Android Back close the top layer;
- virtual keyboard does not hide essential input/action UI;
- semantic labels/headings;
- status meaning survives without colour;
- reduced motion works.

---

## 22. Anti-patterns

A frontend change fails design review if it introduces or restores any of the following without explicit written approval:

- removal of the cream dotted application identity from ordinary DigiStream shells;
- all-pink page treatment that removes inner-surface contrast;
- random supporting colours with no mapping;
- decorative colour used as lifecycle meaning;
- hard black offset shadows on every operational component;
- huge repeated card grids for list data;
- glassmorphism;
- gradient-heavy operational UI;
- neon glow;
- fake metrics;
- fake progress;
- giant empty-state art that hides the next action;
- duplicate headings;
- multiple generic Studio actions for the same destination;
- feature-local state colours that contradict semantic tokens;
- AI thinking/prompt/model UI without a real AI feature;
- duplicate design-system primitives;
- visually enabled actions that are unavailable;
- enabled primary actions styled as disabled.

---

## 23. Implementation protocol

Before changing a screen:

1. identify the current product responsibility/API owner;
2. read root/scoped agent instructions;
3. read this Constitution;
4. read `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
5. read `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
6. inspect relevant 50-screen reference for product composition/journey intent;
7. inventory existing shared primitives;
8. decide whether the information should be a row/table/card/task list/context panel/etc.;
9. define cream-canvas visibility and inner-surface treatment;
10. define brand/supporting/semantic colour roles;
11. define desktop/mobile behavior;
12. cover loading/empty/error/unauthorized/offline/recovery states;
13. implement without duplicating business logic;
14. run type, unit, build and relevant responsive tests;
15. preserve copy/product/accessibility tests unless the authority intentionally changed;
16. document deliberate deviations.

---

## 24. Definition of visually complete

A surface is visually complete only when:

- the cream dotted DigiStream identity remains recognizable;
- inner surfaces use clean Beautiful UI-quality hierarchy/density;
- dusty pink remains the primary brand anchor;
- supporting colours are restrained and intentional;
- semantic colours remain truthful;
- repeated data uses efficient rows/tables where appropriate;
- one clear primary action exists;
- shared primitives are used;
- loading/empty/error/recovery states are coherent;
- mobile and desktop are complete;
- accessibility interactions work;
- relevant tests pass;
- the screen feels like **DigiStream**, not a Beautiful UI clone and not the old oversized cream-card layout.
