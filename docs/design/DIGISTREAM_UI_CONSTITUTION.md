# DigiStream Design System / UI Constitution

Version 2.0 — neutral broadcast-operations system with Beautiful UI adaptation rules

## 0. Purpose and authority

This document is the reusable visual and interaction contract for DigiStream.

For any frontend change, product truth remains more authoritative than presentation. Authorization, lifecycle, tenant isolation, media readiness, recording/replay availability, privacy, reliability and accessibility must never be fabricated or weakened to satisfy a visual reference.

For reusable frontend presentation use this order:

1. root product/quality/lifecycle requirements in `AGENTS.md`;
2. this Constitution;
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
5. feature-specific product documents;
6. the 50-screen reference pack for screen responsibility, flow, information grouping and relative hierarchy;
7. current implementation details that do not conflict with the rules above.

The former application-wide cream dotted canvas, dusty-pink-heavy poster treatment, square-card mandate and hard black offset-shadow mandate are **superseded** by this version.

The 50-screen pack remains useful for product composition and journey intent, but it no longer overrides this Constitution for reusable color, density, radius, elevation, table, navigation or surface rules.

The UI should read as:

> calm, premium, compact broadcast operations software + clear listener experience + trustworthy live-state tooling.

Never as:

> a generic template dashboard, oversized card gallery, cream editorial poster, AI-agent clone, or decorative mock-up disconnected from product state.

---

## 1. Non-negotiable principles

1. **Truth before appearance.** Every status, metric, progress state, availability claim and action is backed by real authorized state.
2. **One primary action per state.** Secondary actions must not compete visually with the next valid action.
3. **Compact, useful density.** Repeated records use rows/tables when comparison matters rather than giant cards.
4. **Neutral foundation.** Large application surfaces are neutral; brand accent is used selectively.
5. **Clear hierarchy without decoration overload.** Typography, spacing, alignment and borders do most of the work.
6. **Subtle elevation.** Borders and surface contrast are preferred over heavy shadows.
7. **Consistent component grammar.** Reusable patterns live in the shared design system.
8. **Responsive by design.** Desktop and mobile behavior are defined together.
9. **Accessible interaction.** Keyboard, touch, focus, reduced motion, Back/Escape and screen-reader semantics are first-class.
10. **No duplicate product surfaces.** Existing responsibilities are realigned, not forked for visual reasons.
11. **Operational screens stay calm.** Live/Studio interfaces reduce distraction as operational importance increases.
12. **External references are adapted, not blindly copied.** Beautiful UI contributes interaction grammar; DigiStream remains a broadcast product.

---

## 2. Core token direction

Production token definitions live in `DESIGN_TOKENS.md` and the shared design-system implementation. This section defines their semantic roles.

### 2.1 Color roles

Use a neutral light system:

- `--ds-bg`: very-light neutral application background;
- `--ds-surface`: primary white/near-white surface;
- `--ds-surface-subtle`: secondary neutral surface;
- `--ds-text`: near-black primary text;
- `--ds-text-secondary`: readable muted text;
- `--ds-text-tertiary`: metadata only, still contrast-safe;
- `--ds-border`: light neutral boundary;
- `--ds-border-strong`: selected/focus/structural boundary;
- `--ds-brand`: DigiStream accent used selectively;
- `--ds-live`: live semantic state;
- `--ds-success`: healthy/ready/completed where success is truly meant;
- `--ds-warning`: degraded/reconnecting/attention;
- `--ds-danger`: failed/destructive/error;
- `--ds-focus`: high-visibility focus ring.

Rules:

- no cream page wash as a mandatory brand canvas;
- no dotted background as an application-wide requirement;
- no rainbow feature palette;
- no semantic green for actions that are merely primary;
- live state must be visually distinct from generic success;
- color never carries status meaning alone;
- avoid large saturated panels unless a real state deserves emphasis.

### 2.2 Surfaces

Prefer three levels:

1. page background;
2. primary surface;
3. subtle secondary/selected surface.

Do not wrap every subsection in another card. A divider, heading, spacing, or row group is often sufficient.

---

## 3. Typography

The application should be readable before it is expressive.

Recommended role split:

- primary sans-serif for headings, body copy, controls and navigation;
- optional monospace for technical metadata, IDs, timestamps, diagnostics and code-like information only.

Rules:

- do not set normal product paragraphs in monospace;
- do not use oversized marketing-scale headings in operational creator screens;
- use weight, spacing and hierarchy rather than decorative fonts to communicate importance;
- labels are concise and sentence case unless a compact metadata convention clearly benefits from uppercase;
- long names and titles wrap or truncate intentionally with accessible full-value access where needed;
- avoid shrinking text merely to fit a narrow layout.

Suggested scale:

| Role | Mobile | Desktop | Typical weight |
|---|---:|---:|---:|
| Page title | 28–32px | 30–36px | 650–750 |
| Section title | 20–24px | 22–26px | 600–700 |
| Card/row title | 15–17px | 15–18px | 550–650 |
| Body | 14–16px | 14–16px | 400–500 |
| Metadata | 12–14px | 12–14px | 400–500 |
| Button/label | 13–15px | 13–15px | 550–650 |

Do not treat these ranges as excuses for feature-local one-off values. Map them to shared tokens.

---

## 4. Spacing and density

Use a 4px base scale and shared spacing tokens.

Recommended roles:

```text
4 8 12 16 20 24 32 40 48 64
```

Guidelines:

- ordinary page padding: 16–24px mobile, 24–40px desktop;
- major section gap: 24–40px;
- primary panel padding: 16–24px;
- compact row vertical padding: 10–14px;
- related controls: 8–12px gaps;
- unrelated groups: 20–32px gaps.

Density rules:

- repeated data should become rows before it becomes a grid of large cards;
- mobile density is not achieved by shrinking touch targets;
- desktop density is not achieved by making text lines excessively wide;
- avoid excessive vertical travel caused by stacked wrappers, repeated headings or duplicate status blocks;
- if a screen requires constant scrolling to reach its main action, reassess hierarchy before adding more containers.

---

## 5. Borders, radius and elevation

### Borders

Use subtle neutral borders for structure. Increase boundary contrast for selected, focused or high-importance states.

### Radius

Use restrained, consistent radius.

Recommended defaults:

- standard control/surface: 6–10px;
- compact chip/badge: may be more rounded where semantics benefit;
- avatar: circular;
- media artwork: may use feature-specific radius within system bounds.

Do not use giant 20–28px SaaS radii for ordinary creator panels.

### Elevation

- many surfaces need border only;
- use low-opacity/low-blur shadow for floating overlays when needed;
- do not use hard black offset shadows as the default application signature;
- do not use permanent glow;
- do not use glassmorphism/frosted panels for core product surfaces;
- avoid nested shadows inside already-elevated components.

---

## 6. Navigation constitution

### Creator desktop

Prefer a stable compact sidebar or equivalent persistent navigation region inspired by Beautiful UI's Sidebar Nav pattern.

Navigation should represent real product responsibilities, typically:

- Overview;
- Broadcasts;
- Studio;
- Recordings;
- Analytics only when real/available;
- Studio Lobby / Chat / Guests where distinct responsibilities exist;
- account/workspace/settings access.

Rules:

- navigation rows are compact, label-first and easy to scan;
- active item uses a subtle selected treatment;
- do not create navigation cards;
- counts use small badges only when meaningful;
- workspace switching uses real memberships and preserves valid context;
- labels must remain stable across pages.

### Mobile

Use the validated mobile navigation model. Do not compress the desktop sidebar into an unusable narrow strip.

Mobile navigation must preserve:

- primary task discoverability;
- browser/Android Back behavior;
- safe areas;
- virtual keyboard behavior;
- clear account access;
- no covered primary action.

---

## 7. Page architecture

### 7.1 Page header

A standard page header contains only what the user needs:

- title;
- optional short supporting sentence;
- optional primary action;
- optional compact contextual controls.

Avoid repeated page titles inside the first card.

### 7.2 Sections

Use section headers, spacing and dividers before adding containers.

A section should have one clear responsibility.

### 7.3 Cards

Cards are for meaningful grouping, not default layout.

Use cards for:

- one state-aware current task;
- approval/confirmation;
- compact insight;
- contextual resource summary;
- contained form/setting group;
- media/player surface where enclosure is useful.

Do not use a card for every broadcast row, metric, line of helper text and action.

---

## 8. Required reusable patterns

The shared design system should support or converge toward reusable versions of:

- Button;
- IconButton;
- Badge / StatusBadge / StatusDot;
- PageHeader;
- SectionHeader;
- Sidebar / navigation row;
- SearchField;
- CommandSearch;
- FilterTabs / status filters;
- DataTable / responsive record rows;
- TaskRow / TaskList;
- LoadingState;
- EmptyState;
- ErrorState;
- ContextPanel / ContextCard;
- ConfirmationDialog / ApprovalCard;
- InsightCard;
- MessageRow;
- Composer;
- SelectionBar;
- Toolbar;
- Modal/Sheet primitives.

Equivalent existing components should be reused rather than renamed for style alone.

Feature components own domain composition. Generic design-system components must not become business-state authorities.

---

## 9. Tables and repeated records

Use a table/row model when users compare multiple structured resources.

Strong candidates:

- Broadcasts;
- Recordings;
- Admin users;
- Team members;
- Invitations;
- sessions/security records;
- channels where comparison matters.

Desktop:

- aligned columns;
- compact filters;
- lifecycle/status column;
- contextual row action;
- sensible truncation and accessible title/label behavior.

Mobile:

- convert to compact stacked record rows/cards;
- preserve the most decision-relevant fields;
- move secondary metadata behind disclosure when necessary;
- avoid horizontal scrolling for the primary workflow unless the data genuinely requires it.

---

## 10. Status and lifecycle presentation

DigiStream has critical lifecycle distinctions. Presentation must preserve them.

At minimum distinguish truthfully:

- draft;
- scheduled;
- overdue scheduled;
- starting;
- live;
- reconnecting;
- ending;
- completed;
- cancelled;
- failed;
- recording requested/processing/ready/published/failed where applicable.

Rules:

- scheduled content never pulses or looks live;
- reconnecting is not represented as healthy live;
- microphone signal does not imply public delivery;
- private Studio contribution does not imply listener delivery;
- completed does not imply recording/replay availability;
- status badges combine text/icon/shape with color;
- status copy uses stable terminology established by product tests/docs.

---

## 11. Loading, progress and recovery

Adapt Beautiful UI's Loading State and Task Rows patterns.

Use:

- skeleton for content whose structure is known;
- inline spinner/state for short indeterminate action;
- elapsed time only when useful;
- determinate percentage only when real progress exists;
- step list when work has meaningful real stages;
- recovery action when failure is actionable.

Never:

- fabricate percentages;
- fabricate completion stages;
- show success before authoritative confirmation;
- make loading change button width and shift nearby layout;
- animate a scheduled waiting state as though work is actively progressing.

---

## 12. Confirmations and destructive actions

Use a clear approval/confirmation pattern for consequential actions.

Required content:

- consequence-specific title;
- short factual explanation;
- safe/cancel action;
- explicit consequential action label.

Examples:

- `End broadcast` rather than `Confirm`;
- `Delete recording` rather than `Continue`;
- `Suspend user` rather than `Yes`.

Server authorization remains mandatory regardless of UI confirmation.

---

## 13. Overview constitution

Creator Overview answers:

1. What is happening now?
2. What should I do next?
3. What is blocked or recovering?

Preferred order:

1. page header;
2. one primary contextual action;
3. live/recovering/current broadcast state;
4. next scheduled/draft item;
5. compact task/readiness rows when useful;
6. recent records as rows;
7. analytics insight only when trustworthy.

Overview must not become a gallery of generic KPI cards or impossible actions.

---

## 14. Studio constitution

Studio is operational software.

Primary hierarchy:

- selected organization/channel/broadcast identity;
- microphone/device state;
- private contribution state;
- public delivery state;
- live state/duration when real;
- one critical primary action;
- bounded recovery;
- secondary diagnostics.

Operational rules:

- critical controls remain stable in position;
- live UI becomes calmer, not more decorative;
- technical details are progressively disclosed;
- reconnecting states show what is healthy versus degraded;
- end-broadcast action is protected from accidental activation;
- mobile short-height layouts preserve access to the critical control and current state.

---

## 15. Chat / Studio Lobby / guests

Human communication UI should be compact and readable.

- messages use clear sender/body/time hierarchy;
- moderation actions are secondary until needed;
- composer remains visible with keyboard open;
- message list does not use one oversized card per message;
- AI reasoning UI is not used for normal human chat;
- guest readiness/status belongs in compact rows;
- role/capability rules remain API-backed.

---

## 16. Analytics

Analytics is shown only when trustworthy data exists.

Use Beautiful UI-style Insight Cards for information that supports a decision.

Every metric requires:

- source;
- time range;
- unit;
- handling for unavailable/partial data;
- consistent comparison basis if a percentage change is displayed.

Do not invent zeroes, trends, confidence, retention or listener counts.

Avoid decorative KPI grids with no action value.

---

## 17. Search and command interface

A command search may provide quick navigation and authorized resource lookup.

Rules:

- keyboard complete;
- accessible focus movement;
- live filtering;
- understandable empty state;
- authorized results only;
- no duplicate route/business logic;
- recent/recommended actions must be safe for the current role and state.

---

## 18. Motion

Follow `PREMIUM_INTERACTION_MOTION_AND_PRODUCT_POLISH.md` for full motion authority.

Constitution-level rules:

- motion explains state or continuity;
- controls acknowledge input immediately;
- success waits for real confirmation;
- transitions are short and restrained;
- reduced motion is fully usable;
- no continuous decorative particles, parallax, glow, shimmer or blur;
- skeleton shimmer, if used, must be subtle and disabled/reduced appropriately;
- live/reconnecting movement must reflect real state.

---

## 19. Responsive and accessibility requirements

Every shared component and changed surface must be validated at applicable matrix points:

- small Android portrait;
- large phone portrait;
- short-height landscape;
- desktop;
- Android desktop-site simulation when required by CI;
- 200% zoom where current acceptance tests cover it.

Required behavior:

- no ordinary horizontal overflow;
- readable text without forced shrinking;
- 44px-class touch targets where appropriate;
- visible keyboard focus;
- keyboard/touch/mouse parity;
- correct focus trap and restoration for overlays;
- Escape and browser/Android Back close the correct layer;
- virtual keyboard does not hide essential input/action UI;
- semantic labels and headings;
- status meaning survives without color;
- reduced motion works.

---

## 20. Anti-patterns

A UI change fails design review if it introduces or restores any of these without explicit product approval:

- mandatory cream dotted application canvas;
- heavy dusty-pink page wash;
- hard black offset shadows across ordinary surfaces;
- oversized card grids for list data;
- 20px+ radius everywhere;
- glassmorphism;
- gradient-heavy primary UI;
- neon glow;
- fake metrics;
- fake progress percentages;
- generic `Are you sure?` destructive copy;
- giant empty-state illustrations that push the next action below the fold;
- duplicate page titles;
- multiple generic Studio buttons for the same destination;
- feature-local status colors that contradict semantic tokens;
- AI thinking/prompt/model UI without an actual AI feature;
- page-local one-off components that duplicate the design system;
- visually enabled actions that are actually disabled;
- disabled-looking primary actions that are actually enabled.

---

## 21. Implementation protocol

Before changing a screen:

1. identify product responsibility and current API/domain owner;
2. read the required agent/product docs;
3. read `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. inspect existing shared primitives;
5. inspect the relevant 50-screen reference for content/flow intent only;
6. choose the correct reusable pattern;
7. define desktop + mobile behavior;
8. define loading/empty/error/unauthorized/recovery states;
9. implement without duplicating business logic;
10. run type, unit, build and responsive tests;
11. compare changed copy against acceptance contracts;
12. update documentation/tests only when an intentional authority change occurred.

Do not weaken a product or accessibility contract merely because a new visual implementation fails an old test. Determine whether the test protects product truth, copy, accessibility, lifecycle behavior, or obsolete visual styling before changing it.

---

## 22. Definition of visually complete

A surface is visually complete only when:

- it follows this Constitution;
- it uses the correct real product state;
- it uses shared primitives;
- its repeated data density is appropriate;
- it has one clear primary action;
- mobile and desktop behavior are complete;
- loading/empty/error/recovery states are styled coherently;
- accessibility interactions work;
- relevant tests pass;
- it does not depend on obsolete cream-poster visual rules;
- it feels like the same DigiStream system as adjacent surfaces.
