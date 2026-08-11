# DigiStream Beautiful UI Adaptation Standard

Status: **mandatory frontend implementation standard**

External design reference: `https://beautiful-ui-five.vercel.app/`

This document defines how DigiStream should adapt the strongest interaction and component patterns from Beautiful UI without turning DigiStream into an AI-agent product, copying illustrative data, duplicating existing product flows, or weakening DigiStream's broadcast-specific product truth.

It is written for humans and implementation agents including Codex, Claude Code, Cline, Copilot-style agents, repository agents, and future automated contributors.

---

## 1. Authority and intent

For frontend presentation and reusable UI composition, use this order:

1. product truth, authorization, lifecycle, media-readiness, reliability, accessibility, and privacy rules referenced by root `AGENTS.md`;
2. `DIGISTREAM_UI_CONSTITUTION.md`;
3. this Beautiful UI adaptation standard;
4. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
5. feature-specific product documents;
6. the 50-screen reference pack for screen responsibility, content grouping, and journey intent;
7. existing implementation details that do not conflict with the sources above.

Beautiful UI is a **design-system and interaction reference**, not a product specification. DigiStream remains a broadcasting, listening, Studio, guest, recording, and replay product.

The target is:

> calm, compact, highly legible broadcast operations software with strong hierarchy, restrained surfaces, useful density, and clear state communication.

The target is not:

> an AI chat product, an oversized card gallery, a decorative mock-up, a cream poster layout, or a generic template dashboard.

---

## 2. What is being adopted from Beautiful UI

The reference demonstrates the following reusable patterns:

- Loading State;
- Approval Card;
- Tool Chips;
- Task Rows;
- Chat;
- Recommendation Card;
- Context Cards;
- Records Table;
- Filter Table;
- Sidebar Nav;
- Search;
- Insight Cards;
- Selection Actions.

DigiStream should adapt those patterns where they improve a real existing responsibility.

The following Beautiful UI patterns are **not default DigiStream components** because they are AI-agent-specific:

- Thinking traces;
- Streaming Text as an assistant response pattern;
- Prompt Bar with model selection;
- Fine-tune inspector;
- agent reasoning timelines;
- code-generation surfaces.

Do not introduce those patterns unless DigiStream gains a real product feature that requires them and the product specification is updated first.

---

## 3. The adaptation rule: borrow grammar, not product identity

Agents must not copy the Beautiful UI page wholesale.

Borrow:

- compact information density;
- thin borders;
- subtle surface separation;
- muted secondary text;
- small state indicators;
- clear row hierarchy;
- restrained shadows;
- one dominant action per state;
- command-search ergonomics;
- tables for repeated structured records;
- inline loading/progress when appropriate;
- approval patterns before consequential actions;
- calm empty states;
- useful negative space;
- predictable component rhythm.

Do not borrow:

- AI-specific vocabulary;
- fake agent progress;
- fake confidence percentages;
- model selectors;
- tool-call traces;
- reasoning panels;
- sample creamery/vendor data;
- decorative behavior that has no DigiStream product meaning.

---

## 4. Visual direction that supersedes the old cream-poster treatment

The earlier cream dotted canvas, heavy dusty-pink usage, square poster cards, and hard black offset-shadow treatment are no longer mandatory application-wide rules.

The v2 product UI should instead use a neutral operational foundation:

- neutral light page canvas;
- white or near-white primary surfaces;
- near-black primary text;
- cool/neutral muted text;
- light gray borders;
- restrained elevation;
- compact component spacing;
- modest corner radius where it improves grouping;
- brand accent used selectively rather than as a page wash;
- semantic green/amber/red only for actual semantic state.

The old 50-screen images remain useful for **what belongs on a screen, relative hierarchy, journey responsibility, and content grouping**. They no longer override the v2 system for background color, shadow style, radius, density, table treatment, or navigation treatment.

---

## 5. Required component mapping

### 5.1 Sidebar Nav -> Creator shell

Beautiful UI reference: **Sidebar Nav**.

DigiStream use:

- Creator Overview;
- Broadcasts;
- Studio;
- Recordings;
- Analytics only when trustworthy and enabled;
- Studio Lobby / audience operations where product terminology requires it;
- account/workspace access;
- settings.

Rules:

- desktop creator navigation should be a compact, stable sidebar or equivalent persistent navigation region;
- navigation rows are compact and aligned, not large cards;
- active state uses a subtle background/accent/border treatment, not a giant filled panel;
- icons support labels but never replace essential labels;
- optional counts use small badges aligned to the row end;
- workspace switcher belongs near the top or account region and must use real organization membership data;
- account/settings remain discoverable without competing with primary product navigation;
- mobile uses the repository's validated mobile navigation behavior rather than squeezing the desktop sidebar into a narrow viewport.

Recommended creator grouping:

```text
WORKSPACE
Overview
Broadcasts
Studio
Recordings
Analytics          # only when real and available

AUDIENCE
Studio Lobby       # when applicable
Chat               # when distinct in the product
Guests             # when applicable

ACCOUNT
Account
Settings
```

Do not add a route merely because a navigation label exists in this example. Navigation must map to real existing responsibilities.

### 5.2 Search -> command search

Beautiful UI reference: **Search**.

DigiStream use:

- creator command search;
- broadcast search;
- recording search;
- workspace navigation;
- quick actions.

A future global command search may support `Ctrl/Cmd + K` when implemented accessibly.

Possible actions:

- Create broadcast;
- Open Studio;
- Open current live broadcast;
- Find broadcast by title;
- Find recording;
- Switch workspace;
- Open settings.

Rules:

- search results must derive from authorized data;
- no result may reveal a private resource the user cannot access;
- keyboard navigation must be complete;
- an empty state explains that no authorized match exists;
- a command palette is not permission to duplicate routing/business logic.

### 5.3 Task Rows -> lifecycle and readiness

Beautiful UI reference: **Task Rows**.

DigiStream use:

- onboarding progress;
- Studio preparation;
- contribution readiness;
- public-delivery readiness;
- recording processing;
- recovery operations;
- multi-stage actions with real stage evidence.

Examples:

```text
Getting your broadcast ready
✓ Channel configured
✓ Microphone detected
● Connecting private Studio
○ Checking public delivery
○ Ready to go live
```

and:

```text
Broadcast health
✓ Studio connection        Healthy
✓ Microphone               Connected
● Public stream            Reconnecting
✓ Recording                Active
```

Rules:

- completed/running/failed state comes from real evidence;
- a percentage is shown only when progress is actually measurable;
- never fake `68%` because the reference shows a progress percentage;
- never use animated running state for a scheduled item that is simply waiting for time;
- do not imply public delivery from microphone or private LiveKit state.

### 5.4 Filter Table -> Broadcasts and Recordings

Beautiful UI reference: **Filter Table**.

Use for repeated records with lifecycle filters.

Broadcast example:

```text
[All] [Live] [Scheduled] [Draft] [Completed]

Broadcast          Channel       Date            Status
Sunday Service     Main Radio    Today 19:00     Live
Morning Devotion   Devotional    Tomorrow        Scheduled
Youth Connect      Youth         Aug 09          Completed
```

Recording example:

```text
[All] [Processing] [Ready] [Published] [Failed]

Recording          Duration      Created         Status
Sunday Service     1h 42m        Aug 10          Ready
Morning Devotion   38m           Aug 09          Published
Youth Connect      —             Aug 08          Processing
```

Rules:

- prefer rows/tables over giant repeated cards when users compare multiple records;
- desktop tables must have a defined mobile transformation;
- mobile may use compact stacked rows, not a horizontally scrolling desktop table by default;
- row actions are lifecycle-specific;
- table filters change real data presentation, not fake tab content;
- status and action text must remain understandable without color.

### 5.5 Records Table -> admin and structured management

Beautiful UI reference: **Records Table**.

DigiStream use:

- users/team members;
- invitations;
- channels;
- recordings;
- admin management;
- session/security records where appropriate.

Rules:

- structured records should be aligned for scanning;
- use compact metadata, tags, and row actions;
- destructive row actions require confirmation where consequence warrants it;
- selection controls must have a real bulk action owner before being shown.

### 5.6 Loading State -> asynchronous operations

Beautiful UI reference: **Loading State**.

Use for:

- Studio connection;
- microphone permission/device discovery;
- delivery start;
- recording preparation/processing;
- authentication/session restoration;
- data fetches that exceed the threshold where feedback is useful.

Preferred pattern:

```text
Connecting to Studio
Establishing secure connection…     3.4s
```

or, when determinate:

```text
Processing recording
74%
Encoding audio…
```

Rules:

- use elapsed time only when it helps the user understand a real wait;
- percentage requires measurable progress;
- loading must not move primary controls around unpredictably;
- preserve control width while loading;
- success appears only after authoritative confirmation;
- failures include a bounded recovery action.

### 5.7 Approval Card -> consequential actions

Beautiful UI reference: **Approval Card**.

DigiStream use:

- Go live when an explicit final confirmation is appropriate;
- End broadcast;
- Delete recording;
- Remove participant;
- Suspend user;
- revoke session;
- destructive workspace/admin changes.

Example:

```text
End this broadcast?
Listeners will be disconnected and recording processing may begin.

Keep broadcasting     End broadcast
```

Rules:

- title states the consequence;
- supporting copy is short and factual;
- safe action appears first;
- destructive action is visually distinct;
- never hide important consequence behind vague `Are you sure?` copy;
- irreversible operations require server-side authorization regardless of UI confirmation.

### 5.8 Chat -> Studio Lobby and audience communication

Beautiful UI reference: **Chat**.

Use for:

- live chat;
- Studio Lobby communication;
- guest/backstage messaging where supported.

Rules:

- message density should be compact and scannable;
- sender, timestamp/state, body, moderation/action controls have a stable hierarchy;
- composer remains reachable when the virtual keyboard is open;
- opening chat must not silently stop listener playback or Studio audio where technically avoidable;
- moderation actions remain role-aware;
- do not import AI reasoning/reply UI into ordinary human chat.

### 5.9 Context Cards -> resource context

Beautiful UI reference: **Context Cards**.

Use for compact contextual information such as:

- selected channel;
- selected broadcast;
- guest identity/status;
- delivery endpoint summary;
- recording source;
- workspace information;
- technical reference details.

Rules:

- context cards explain the current resource, not duplicate the whole page;
- prefer key-value density over decorative illustration;
- technical IDs/providers stay secondary unless needed for troubleshooting;
- do not expose secrets.

### 5.10 Insight Cards -> Analytics

Beautiful UI reference: **Insight Cards**.

Use only when the repository has trustworthy analytics data.

Possible metrics:

- peak listeners;
- average listening duration;
- replay plays;
- audience retention;
- broadcast-to-broadcast comparison.

Rules:

- no fake zeroes;
- no placeholder growth percentage;
- every chart/metric needs a known source and time range;
- insight copy must describe what the data actually supports;
- charts use restrained color and a consistent scale;
- analytics cards should not become a grid of decorative KPIs with no decision value.

### 5.11 Recommendation Card -> evidence-backed operational guidance

Use sparingly for real, explainable recommendations, for example:

- microphone has no signal and a detected alternate input is available;
- reconnecting public delivery can be retried;
- a scheduled broadcast is overdue and can be started/rescheduled;
- recording is ready for an allowed next action.

Do not show AI-style confidence percentages unless a real model and calibrated confidence contract exist.

### 5.12 Tool Chips -> diagnostics/status details

Use compact chips for secondary technical information such as:

- contribution connected;
- public delivery reconnecting;
- recording processing;
- selected microphone;
- transport/fallback mode when relevant to diagnostics.

Do not expose infrastructure noise to ordinary users by default.

### 5.13 Selection Actions -> bulk operations

Use only where users can truly select multiple records and perform a supported bulk action.

Examples:

- archive selected recordings when the API supports it;
- revoke selected invitations when supported.

Do not render checkboxes as decoration.

---

## 6. DigiStream page architecture

### Creator Overview

Overview is not a card showroom.

Required hierarchy:

1. concise page header;
2. one state-aware primary action;
3. current/next broadcast state;
4. compact task/readiness rows if work is in progress;
5. recent broadcasts or recordings as compact rows;
6. insights only when trustworthy analytics exist;
7. secondary actions with lower visual weight.

### Broadcasts

Prefer:

- page header + create action;
- filter chips/tabs;
- compact table/rows;
- lifecycle-specific actions;
- clear empty state.

Avoid:

- one giant card per broadcast;
- repeated generic `Open Studio` buttons;
- status duplicated in three places;
- decorative metrics that are unavailable.

### Studio

Studio is operational software. Optimize for state clarity and task completion.

Preferred regions:

- broadcast identity/context;
- contribution/audio readiness;
- public-delivery readiness;
- live state and elapsed time when real;
- critical primary control;
- recovery information;
- secondary diagnostics progressively disclosed.

### Recordings

Prefer searchable/filterable rows with:

- title;
- broadcast/channel context;
- duration when known;
- created/completed time;
- processing/publish state;
- contextual actions.

### Analytics

Use Beautiful UI-style insight density only after data is trustworthy. Until then, keep Analytics hidden or explicitly unavailable according to product documents.

### Settings/Admin

Use sections, tables, compact rows, and contextual confirmation. Avoid stacking large cards merely to separate every preference.

---

## 7. Density and spacing

DigiStream v2 should feel efficient rather than empty or cramped.

Guidelines:

- page max width should be deliberate, not full-screen text lines;
- major section gap: approximately 24–40px depending on viewport;
- card/panel padding: approximately 16–24px;
- compact row vertical padding: approximately 10–14px;
- control height: generally 36–44px depending on importance and touch context;
- touch targets must still meet accessibility requirements;
- repeated rows should align to a common grid;
- use whitespace to separate groups rather than adding a new card around every group.

Do not make mobile interfaces merely `desktop but stacked` if that causes excessive vertical travel.

---

## 8. Borders, radius, and elevation

Use subtle structure.

- borders: light neutral by default, stronger on focus/selected state;
- radius: restrained and consistent, generally 6–10px for surfaces/controls unless a component responsibility requires otherwise;
- badges/chips may use a slightly larger pill radius where compact semantics benefit;
- shadows: low blur/low opacity and rare; many surfaces need only a border;
- no hard black offset shadows as an application-wide signature;
- no glassmorphism;
- no heavy gradient cards;
- no neon glow;
- no permanent floating-card illusion for ordinary table rows.

---

## 9. Color system

The application foundation is neutral. Brand color is an accent, not the background architecture.

Recommended semantic roles:

- page background: neutral very-light gray;
- primary surface: white;
- secondary surface: subtle neutral gray;
- primary text: near-black;
- secondary text: medium neutral gray;
- border: light neutral gray;
- brand accent: existing approved DigiStream accent used selectively;
- success: only healthy/ready/completed state;
- warning: only degraded/reconnecting/attention state;
- danger: only destructive/error/failed state;
- live: use a consistent live semantic treatment, not generic success green.

Do not introduce a rainbow of feature-local colors.

---

## 10. Typography

The UI should be readable before it is expressive.

- one primary sans-serif family for application text;
- optional mono only for technical metadata, IDs, timestamps, diagnostics, or places where it improves scanning;
- do not set ordinary paragraphs in monospace;
- headings use weight/size/spacing for hierarchy rather than decorative typefaces;
- avoid oversized display headings inside operational creator surfaces;
- labels remain concise;
- preserve readable line height and text wrapping on mobile.

---

## 11. Interaction and motion

Beautiful UI's calmness comes partly from not animating everything.

Required:

- immediate pressed/hover/focus response;
- short transitions for state changes;
- no animation that delays a real action;
- no fake success animation before server/media confirmation;
- determinate progress only for measurable work;
- reduced-motion support;
- no continuous decorative parallax, blur, glow, particles, or pulsing scheduled content;
- live/reconnecting animation must represent actual state.

Follow `PREMIUM_INTERACTION_MOTION_AND_PRODUCT_POLISH.md` for authoritative motion behavior.

---

## 12. Responsive implementation

Every adapted component must define desktop and mobile behavior before implementation is considered complete.

Test at minimum:

- small Android portrait;
- large phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where CI requires it;
- 200% zoom where existing acceptance tests require it.

Rules:

- no ordinary horizontal page overflow;
- desktop tables become compact mobile record rows where needed;
- sidebar becomes the approved mobile navigation pattern rather than remaining fixed off-screen;
- action bars do not cover content;
- virtual keyboard does not hide the active field/composer/primary action;
- browser/Android Back closes the top transient layer correctly;
- focus is restored after closing dialogs/sheets/search.

---

## 13. Accessibility

All Beautiful UI-inspired work remains subordinate to DigiStream accessibility requirements.

Required:

- semantic HTML;
- visible focus;
- keyboard-complete navigation;
- accessible names for icon-only controls;
- minimum usable touch targets;
- sufficient contrast;
- status not communicated by color alone;
- reduced motion;
- logical heading structure;
- live regions used carefully for asynchronous status changes;
- tables expose correct headers/relationships;
- dialogs trap and restore focus correctly.

---

## 14. Code architecture

Do not implement Beautiful UI patterns as page-local copies.

Prefer shared primitives under `apps/web/src/design-system/` such as:

```text
Button
IconButton
Badge
StatusDot
Sidebar
CommandSearch
PageHeader
SectionHeader
TaskRow
TaskList
DataTable
FilterTabs
EmptyState
LoadingState
ApprovalDialog / ConfirmationCard
SearchField
Toolbar
MessageRow
Composer
ContextPanel
InsightCard
SelectionBar
```

Names may differ if equivalent primitives already exist. Reuse before creating.

Feature folders own domain composition. The design system owns reusable presentation behavior.

Do not move authorization, broadcast lifecycle, recording state, or media readiness into generic UI components.

---

## 15. Migration protocol for agents

Before editing an existing DigiStream screen:

1. Read root `AGENTS.md` and the nearest scoped `AGENTS.md`.
2. Read `DIGISTREAM_UI_CONSTITUTION.md`.
3. Read this file.
4. Read `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`.
5. Identify the existing component and API/domain owner.
6. Identify which Beautiful UI pattern actually fits the responsibility.
7. Open the Beautiful UI reference if network access is available; otherwise use the pattern descriptions in this document.
8. Inspect the relevant 50-screen reference only for journey/content/composition intent.
9. Inventory existing shared primitives before creating new ones.
10. Implement the smallest reusable system change that improves the target surface.
11. Preserve all loading/empty/error/unauthorized/offline/recovery states.
12. Run affected unit, type, build, and responsive tests.
13. Do not weaken tests just to make a redesign pass; update a test only when the authoritative product/design contract intentionally changed.
14. Document deliberate deviations in the PR.

---

## 16. Licensing and source-copy rule

Beautiful UI is an external design reference.

Agents may use its publicly visible interaction ideas and visual patterns as inspiration. Do **not** paste substantial source code, assets, illustrations, proprietary icons, or other copyrighted implementation material into DigiStream unless the applicable license has been verified and repository notices are updated when required.

When license status is unclear, reimplement the pattern using DigiStream's existing React/CSS/design-system architecture.

---

## 17. Acceptance checklist for a Beautiful UI-inspired change

A change is not complete unless all applicable answers are yes:

- Does it solve a real DigiStream product responsibility?
- Does it reuse an existing surface rather than creating a duplicate?
- Is the information density more efficient without becoming cramped?
- Is there one clear primary action for the current state?
- Are repeated records represented as rows/tables where comparison matters?
- Is every status backed by real state?
- Are loading/progress indicators truthful?
- Are destructive actions explicit and confirmed appropriately?
- Does the mobile transformation remain usable without horizontal overflow?
- Are keyboard, focus, touch, Back/Escape, and reduced-motion behaviors correct?
- Are data and authorization boundaries preserved?
- Does the implementation use shared primitives rather than page-local visual duplication?
- Did the change avoid AI-specific patterns unless an actual AI feature exists?
- Did the change avoid returning to the obsolete cream dotted / hard-shadow poster treatment?
- Does CI remain green?

If not, the adaptation is incomplete.
