# DigiStream UI V2 Visual Migration Plan

Purpose: migrate the existing web application into the complete cream-dotted DigiStream + Beautiful UI-quality system without duplicating product flows or stopping after token/foundation work.

Read first:

1. `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`;
2. `DIGISTREAM_UI_CONSTITUTION.md`;
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. `DESIGN_TOKENS.md`;
5. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`.

External reference: `https://beautiful-ui-five.vercel.app/`

## Migration principle

The target is not “copy Beautiful UI” and not “copy the 50 screenshots exactly.”

The target is:

> keep DigiStream's cream dotted identity while converting the real product into a cleaner, denser, modern, readable, Beautiful UI-quality operational interface.

Do not build a second application.

## Phase 0 — baseline and inventory

Before broad editing:

- inspect branch/status/recent commits;
- run/inspect existing typecheck/build/tests;
- identify existing shared design-system primitives;
- map routes/features to current responsibility;
- identify visible Echoo branding;
- identify ordinary mono/typewriter UI;
- identify giant repeated cards;
- identify heavy shadows / excessive radius / legacy dark or blue styling;
- identify responsive failures including vertical-letter buttons and horizontal overflow;
- identify applicable Beautiful UI pattern per surface;
- identify reference screen for journey/composition intent.

Do not use a global regex/perl/sed visual rewrite as the migration strategy.

## Phase 1 — shared foundation and typography

Implement/reconcile centrally:

- cream dotted canvas;
- white/warm-white operational surfaces;
- dusty-pink brand tokens;
- supporting tint tokens;
- fixed semantic state tokens;
- Manrope/current modern sans ordinary UI;
- IBM Plex Mono technical-only;
- restrained radius;
- border/elevation hierarchy;
- accessible focus;
- motion tokens;
- base buttons/inputs/status components.

Acceptance:

- ordinary buttons/nav/forms are not monospace;
- no stale dark/emerald or generic blue foundation;
- cream/dots still recognizable;
- no hard shadow on every nested component.

## Phase 2 — required shared Beautiful UI-style primitives

Converge/create reusable ownership for applicable equivalents of:

- PageHeader / SectionHeader;
- Sidebar / NavSection / NavItem;
- mobile creator navigation;
- workspace/account switcher;
- SearchField / CommandSearch;
- FilterTabs;
- DataTable / ResponsiveRecordRow;
- TaskRow / TaskList;
- LoadingState;
- Empty/Error/Offline/Unauthorized states;
- ApprovalCard / confirmation dialog/sheet;
- ContextCard;
- InsightCard;
- MessageRow / Composer;
- SelectionBar where real;
- shared Modal/Sheet behavior.

**Do not continue claiming UI V2 completion if only TaskRow/ContextCard exist while the other required responsibilities remain feature-local or absent.**

## Phase 3 — application shells and branding

### Creator shell

- compact Beautiful UI-quality sidebar on desktop;
- validated mobile navigation;
- real workspace/account context;
- subtle selected states;
- DigiStream branding;
- no giant nav tiles.

### Public/listener shell

- cream/dotted identity where compatible with playback readability;
- clean operational surfaces;
- playback-first hierarchy;
- DigiStream branding.

Global branding sweep:

- remove visible Echoo from headers, landing, footer, auth and system states;
- internal legacy class/file names may remain only when safe migration requires it.

## Phase 4 — Creator Overview

Required:

- concise header;
- one state-aware primary action;
- current/live/recovering context;
- next scheduled/draft context;
- real task/readiness rows;
- recent broadcasts/recordings as compact rows;
- trustworthy insight only when real;
- no giant KPI/card gallery.

## Phase 5 — Broadcasts

- filter tabs based on real lifecycle groups;
- desktop record table/rows;
- mobile compact stacked records;
- lifecycle-specific contextual actions;
- no generic Studio button repeated across every state.

## Phase 6 — Recordings

- searchable/filterable record-oriented layout;
- truthful processing/replay/publish state;
- compact responsive rows;
- contextual actions only when real/authorized.

## Phase 7 — Studio

- calm neutral/white central workspace inside cream shell;
- selected organisation/channel/broadcast context;
- microphone readiness row;
- private contribution row;
- public delivery row;
- live/reconnecting/recording truth;
- stable critical controls;
- compact loading/recovery;
- explicit end-broadcast confirmation;
- diagnostics progressively disclosed.

## Phase 8 — Studio Lobby / Backstage / Guests / Chat

- compact participant rows;
- clear role/readiness status;
- human message hierarchy;
- composer safe above mobile keyboard;
- role-aware moderation;
- compact context panels;
- no AI reasoning/model UI.

## Phase 9 — Analytics

- Insight Cards only for trustworthy metrics;
- source/scope/time range defined;
- no decorative fake zeros;
- hide/unavailable when data is not trustworthy.

## Phase 10 — Account / Settings / Team / Admin

- structured sections/rows/tables;
- compact sessions/team/users records;
- explicit Approval/Confirmation for consequential operations;
- no giant card stack.

## Phase 11 — Auth / onboarding

- modern sans ordinary UI;
- compact forms;
- clear intent and one primary action;
- DigiStream branding;
- keyboard-safe mobile behavior;
- real recovery/errors.

## Phase 12 — Public landing page and footer

Follow the explicit landing contract in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.

Mandatory corrections include:

- controlled mobile hero (roughly 42–48px, not poster-scale);
- modern sans CTA/labels;
- compact capabilities instead of four giant full-width cards;
- compact three-step journey instead of tall numbered cards;
- meaningful supporting sections only;
- one clear final CTA;
- grouped responsive footer with DigiStream branding and Product/Company/Legal structure;
- no randomly floating links.

## Phase 13 — Listener/public/guest polish

- playback-first hierarchy;
- truthful scheduled/live/replay distinction;
- compact discovery/library rows/cards according to content type;
- thumb-reachable controls;
- guest flow remains focused and separate from creator shell.

## Phase 14 — System states

Fix shared loading/offline/error/unauthorized behavior.

Mandatory:

- banner buttons never wrap into vertical letters;
- mobile banners stack deliberately;
- blocking state content uses compact max-width;
- one obvious recovery action;
- no giant empty poster state unless truly appropriate.

## Phase 15 — full reconciliation

Search and classify:

- visible `Echoo` strings;
- old dark/emerald values;
- generic blue brand values;
- ordinary mono/typewriter UI;
- giant repeated cards;
- hard shadows;
- excessive radii;
- duplicate navigation/actions;
- horizontal overflow;
- stale tests protecting obsolete presentation.

Do not blindly replace. Fix deliberately and preserve product truth.

## Phase 16 — validation

Run applicable:

- typecheck;
- API/unit tests;
- production build;
- Node 22;
- Node 24;
- responsive Playwright;
- desktop Chromium;
- Android Chrome;
- Android desktop-site simulation;
- short-height landscape;
- 200% zoom-equivalent cases;
- virtual keyboard;
- Back/Escape/focus restoration.

Do not weaken tests merely to get green.

## Completion

Migration is complete only when the completion gates in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` pass and the implementation—not just documentation—reflects the final system.
