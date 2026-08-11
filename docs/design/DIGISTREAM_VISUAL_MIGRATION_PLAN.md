# DigiStream Visual Migration Plan

Purpose: migrate the current web implementation into the **cream-dotted DigiStream + Beautiful UI-quality hybrid system** without creating duplicate product flows, breaking backend truth, or attempting one unsafe visual mega-change.

This plan is subordinate to root product/quality requirements and uses:

- `DIGISTREAM_UI_CONSTITUTION.md`;
- `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
- `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
- `DESIGN_TOKENS.md`.

External reference: `https://beautiful-ui-five.vercel.app/`

## Migration principle

The target is not “copy Beautiful UI” and not “copy 50 screenshots exactly.”

The target is:

> preserve DigiStream's warm cream dotted identity while converting the product's inner operational interface into a cleaner, denser, more systematic component language inspired by Beautiful UI.

Do not build a second application beside the existing one.

---

## Phase 0 — inventory before editing

Before changing CSS/components:

1. inventory current tokens in `apps/web/src/design-system/`;
2. locate the current cream/dotted background implementation;
3. identify oversized repeated cards;
4. identify heavy nested hard shadows;
5. identify raw colours/radii/shadows outside shared tokens;
6. map current creator/listener/public shells;
7. map each route/component to its existing responsibility;
8. map each applicable surface to a Beautiful UI pattern;
9. map the relevant 50-screen reference for product composition/journey intent;
10. record current responsive/unit/Playwright coverage.

Deliverable: a migration matrix in the PR description or companion implementation note.

Recommended matrix columns:

| Existing surface | Existing owner | Beautiful UI pattern | Shared primitive | Reference screen | Mobile transform | Risk/tests |
|---|---|---|---|---|---|---|

---

## Phase 1 — shared hybrid foundation

Migrate shared tokens/primitives before broad page polish.

Required foundation:

- cream dotted application canvas;
- white/warm-white/neutral inner surfaces;
- dusty-pink brand tokens;
- supporting lavender/sky/mint/amber/peach accent tokens;
- fixed live/success/warning/danger/info tokens;
- typography hierarchy;
- 4px spacing system;
- restrained radius;
- border hierarchy;
- subtle shadow hierarchy;
- rare optional brand-offset shadow;
- focus-visible treatment;
- buttons;
- inputs/selects/textareas;
- badges/status dots;
- tabs/filters;
- modal/sheet base treatment.

Acceptance:

- cream/dotted identity is still recognizable;
- inner operational surfaces no longer rely on all-cream/all-pink treatment;
- no feature-local rainbow palette exists;
- supporting accents do not replace semantic states;
- hard offset shadow is no longer applied to every nested component;
- existing behavior/tests remain valid.

---

## Phase 2 — shared Beautiful UI-inspired primitives

Create or converge existing components toward reusable equivalents of:

- Sidebar/NavItem;
- CommandSearch/SearchField;
- TaskRow/TaskList;
- DataTable/ResponsiveRecordRow;
- FilterTabs;
- LoadingState;
- Approval/ConfirmationDialog;
- ContextPanel;
- InsightCard;
- MessageRow/Composer;
- SelectionBar;
- PageHeader/SectionHeader.

Rules:

- reuse before creating;
- generic components own presentation, not domain truth;
- every component defines mobile behavior;
- every component defines loading/focus/disabled/error behavior where applicable.

---

## Phase 3 — application shells

### Creator shell

Primary goals:

- preserve cream dotted outer canvas;
- add/realign compact Beautiful UI-like creator navigation;
- use white/warm-white sidebar/workspace surfaces where useful;
- active navigation uses subtle treatment with dusty-pink punctuation/accent;
- real workspace/account context remains accessible;
- mobile uses validated mobile navigation instead of a squeezed desktop sidebar.

### Public/listener shell

Goals:

- preserve the cream/dotted DigiStream identity where compatible with player/discovery readability;
- keep playback-first hierarchy;
- use clean white/neutral inner surfaces;
- do not over-card discovery content;
- maintain stable navigation vocabulary.

Acceptance:

- shell identity is coherent across routes;
- no generic gray SaaS shell replaces DigiStream;
- account/sign-out remain discoverable;
- no ordinary horizontal overflow.

---

## Phase 4 — Creator Overview

Reference anchor: screen 01 plus product-hardening requirements.

Beautiful UI patterns:

- Sidebar Nav;
- Task Rows;
- Context Cards;
- Insight Cards only when real;
- compact rows.

Required hierarchy:

1. header;
2. one state-aware primary action;
3. current/live/recovering state;
4. next scheduled/draft state;
5. readiness/task rows if needed;
6. recent records as compact rows;
7. trustworthy insight only when available.

Remove:

- generic KPI-card showroom behavior;
- duplicate headings;
- repeated generic Studio actions;
- fake/empty metric cards.

---

## Phase 5 — Broadcasts

Reference anchor: screen 02.

Beautiful UI patterns:

- Filter Table;
- Records Table;
- Search;
- Approval patterns where destructive actions exist.

Required:

- lifecycle filters;
- searchable/compact rows;
- contextual row actions;
- clear empty states;
- responsive mobile record transformation;
- real lifecycle status.

Prefer a table/row model over giant repeated cards.

---

## Phase 6 — Studio Lobby / Chat / Guests

Reference anchors: 03, 04, 35 where applicable.

Beautiful UI patterns:

- Chat;
- Task Rows;
- Context Cards;
- Tool Chips;
- Loading State.

Required:

- compact guest/readiness rows;
- human chat without AI reasoning traces;
- clear private contribution/public delivery separation;
- composer survives virtual keyboard;
- moderation remains role-aware;
- technical context is secondary/progressive.

Supporting accent tints may distinguish tabs/context groups but must not become status semantics.

---

## Phase 7 — Studio operational surface

Reference anchors: 36, 39.

Beautiful UI patterns:

- Task Rows;
- Loading State;
- Context Cards;
- Tool Chips;
- Approval Card for end-broadcast or other live-critical decisions.

Visual rule:

- outer creator shell may retain cream/dots;
- main Studio work area may be a large solid white/neutral panel to reduce distraction;
- critical state and action remain stable;
- live UI becomes calmer, not more animated.

Acceptance:

- microphone/private/public delivery remain separate;
- reconnecting shows what is healthy/degraded;
- no fake progress;
- end action is protected;
- short-height/mobile access to critical controls is preserved.

---

## Phase 8 — Recordings

Reference anchor: 37.

Beautiful UI patterns:

- Filter Table;
- Records Table;
- Search;
- Loading State;
- Approval Card for deletion;
- Context Cards.

Required columns/fields where real:

- title;
- broadcast/channel context;
- duration;
- created/completed time;
- processing state;
- publish/replay state;
- contextual action.

Mobile transforms to compact rows.

---

## Phase 9 — Analytics/statistics

Reference anchors: 38, 49, 50.

Beautiful UI pattern: Insight Cards.

Only implement metrics with trustworthy sources.

Colour strategy:

- cream dotted outer canvas;
- white/warm-white chart surfaces;
- dusty pink primary data series;
- restrained lavender/sky supporting series;
- mint/amber only where they cannot be misread as semantic success/warning;
- semantic colours reserved for real state.

Do not create decorative KPI grids with invented zeroes/trends.

---

## Phase 10 — Settings, account and admin

Reference anchors: 18, 21–27, 32, 34.

Beautiful UI patterns:

- Records Table;
- Context Cards;
- Search where useful;
- Approval Card;
- compact sections/rows.

Goals:

- reduce giant stacked cards;
- isolate destructive actions;
- keep session/security information distinct;
- preserve permissions/role truth;
- use confirmation patterns with explicit action labels.

---

## Phase 11 — listener discovery/playback

Reference anchors: 13–17, 19, 20, 31, 40–48.

Goals:

- retain DigiStream cream identity around listener surfaces where it does not compete with playback;
- use clean white/neutral panels for content/player controls;
- keep live/scheduled/replay visually distinct;
- preserve playback when chat/request-to-speak opens where technically safe;
- avoid giant cards for every discovery item when compact list/grouping is better.

---

## Phase 12 — visual reconciliation

After major migration:

1. search for removed cream/dotted shell styling and verify intentional exceptions;
2. search for raw feature-local colours;
3. search for supporting accent misuse as status;
4. search for oversized repeated cards;
5. search for excessive hard-offset shadows;
6. search for 20px+ generic radii;
7. search for duplicate page headings;
8. search for obsolete generic Studio actions;
9. compare surfaces to the current Constitution and Beautiful UI adaptation standard;
10. inspect relevant 50-screen references for journey/content intent;
11. run responsive/accessibility matrices;
12. remove obsolete visual code only after confirming it is unused.

---

## Pull-request sizing

Prefer bounded PRs by foundation/shell/journey.

A migration PR should state:

- surfaces targeted;
- Beautiful UI patterns adapted;
- reference screen numbers used for composition/journey intent;
- shared primitives changed;
- cream/dotted shell treatment;
- supporting accent mapping;
- existing components/routes reused;
- responsive/accessibility evidence;
- tests run;
- deliberate deviations.

Avoid one repository-wide visual rewrite that is impossible to review.

---

## Definition of migrated

A surface is migrated only when:

- cream dotted DigiStream identity is preserved where appropriate;
- clean white/neutral operational surfaces are used effectively;
- dusty pink remains the brand anchor;
- supporting colours are restrained/intentional;
- semantic colours remain truthful;
- repeated data uses efficient rows/tables where appropriate;
- shared primitives are reused;
- one clear contextual primary action exists;
- loading/empty/error/recovery states are coherent;
- mobile/desktop behavior is complete;
- accessibility behavior works;
- relevant tests pass.
