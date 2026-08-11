# DigiStream Beautiful UI Adaptation Standard

Status: **mandatory frontend implementation standard**

External design reference: `https://beautiful-ui-five.vercel.app/`

This document defines how DigiStream adapts the strongest component, density, interaction and colour-composition ideas from Beautiful UI **without replacing DigiStream's own visual identity**.

DigiStream remains a broadcasting, listening, Studio, guest, recording and replay product. Beautiful UI is a reference for interface grammar, not a product specification and not a theme to clone.

---

## 1. The core hybrid rule

The correct target is:

> **DigiStream cream dotted canvas + DigiStream dusty-pink brand anchor + Beautiful UI-style clean inner surfaces, compact information density, restrained mixed accent colours, tables/rows, clear status hierarchy, search, loading, approval and insight patterns.**

Do **not** remove the cream dotted background.

Do **not** make every component cream/pink either.

The page should visually work in layers:

```text
Layer 1 — DigiStream identity
Warm cream dotted application canvas

Layer 2 — operational surfaces
White / near-white / soft-neutral cards, tables, sheets and panels

Layer 3 — brand + supporting accents
Dusty pink remains primary brand accent
Restrained lavender / sky / mint / amber / peach tints may differentiate secondary component families

Layer 4 — semantic state
Live / success / warning / danger colours are fixed by real product meaning
```

This is the most important rule in this document.

---

## 2. Authority and precedence

For frontend work, use this order:

1. product truth, authorization, lifecycle, media readiness, reliability, privacy and accessibility rules referenced by root `AGENTS.md`;
2. `DIGISTREAM_UI_CONSTITUTION.md`;
3. this Beautiful UI adaptation standard;
4. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
5. feature-specific product documents;
6. the 50-screen reference pack for screen responsibility, journey, hierarchy and content grouping;
7. current implementation details that do not conflict with the above.

No screenshot or external component demo can justify fake state, fake metrics, duplicate flows, unauthorized actions or inaccurate live/readiness claims.

---

## 3. What we are adapting from Beautiful UI

Beautiful UI currently demonstrates reusable patterns including:

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

These are useful to DigiStream because they emphasize compact hierarchy, calm state communication and efficient repeated-data layouts.

The following AI-specific patterns are **not default DigiStream patterns**:

- Thinking/reasoning traces;
- assistant Streaming Text;
- Prompt Bar with model picker;
- Fine-tune inspector;
- code-generation UI;
- agent tool-call history presented to normal users.

Do not introduce them unless DigiStream later gains a real product feature that needs them.

---

## 4. What to borrow versus what to preserve

### Borrow from Beautiful UI

- compact sidebar/navigation rows;
- clear section grouping;
- subtle borders;
- mostly neutral surfaces;
- small state indicators;
- muted secondary text;
- strong alignment;
- tables for structured repeated records;
- filters that reorganize real data;
- search with live filtering and empty states;
- task rows for real progress/readiness;
- approval cards/dialogs before consequential actions;
- compact chat/message hierarchy;
- context cards for supporting resource information;
- insight cards for trustworthy analytics;
- restrained, intentional colour variation;
- minimal shadow use inside dense application surfaces;
- one clear primary action.

### Preserve from DigiStream

- the warm cream dotted application canvas;
- dusty pink as the main brand accent;
- near-black primary ink;
- the broadcast-specific lifecycle language;
- real creator/listener shells and responsibilities;
- the existing product journeys and API-backed state;
- truthful Studio contribution/public-delivery separation;
- accessibility and responsive acceptance requirements;
- selective tactile personality rather than generic SaaS blandness.

### Do not preserve blindly from the older implementation

- huge cards for every item;
- heavy hard shadow on every nested surface;
- all-pink component treatment;
- excessive vertical travel;
- repeated headings;
- decorative statistics without real data;
- giant empty-state illustration before the user's next action;
- page-local CSS systems that fight the shared design system.

---

## 5. Colour composition: the Beautiful UI mix on top of DigiStream cream

### 5.1 Base canvas

The cream dotted canvas is mandatory on ordinary application pages.

Recommended:

```css
background-color: #F7F3EE;
background-image: radial-gradient(circle, rgba(31, 32, 37, 0.09) 1px, transparent 1.1px);
background-size: 20px 20px;
```

Rules:

- keep dots subtle;
- never allow the dot pattern to reduce text readability;
- a large inner workspace may use a solid surface while cream/dots remain visible around or behind it;
- modal overlays may suppress the visible pattern temporarily;
- dense Studio panels may use solid neutral surfaces for calm operational focus;
- mobile may reduce dot opacity slightly, but should not silently switch to generic gray SaaS background.

### 5.2 Primary surfaces

Use white/near-white surfaces to create the Beautiful UI-like contrast against cream:

- white or warm white cards;
- soft neutral rows;
- light border separators;
- selected/hover states that are subtle, not giant filled blocks.

The cream canvas should be visible enough that the application still feels distinctly DigiStream.

### 5.3 Brand anchor

Dusty pink remains the principal brand accent.

Use it for:

- primary brand action where appropriate;
- selected navigation punctuation;
- focus/active brand detail where accessibility allows;
- important non-semantic product emphasis;
- occasional key chart series;
- subtle icon tile/background tints.

Do not paint the whole page pink.

### 5.4 Supporting accent palette

Beautiful UI feels richer because not every component is forced into one accent. DigiStream may use a **restrained supporting palette** for non-critical grouping and visual distinction.

Recommended families:

- lavender;
- sky blue;
- mint;
- amber;
- peach/rose.

Use pale tints for backgrounds and stronger tones only for small icons, borders or data series.

Example roles:

- lavender tint: contextual/creative secondary panel;
- sky tint: informational/search/context treatment;
- mint tint: calm supportive tile where it cannot be confused with success;
- amber tint: attention/supportive highlight where it cannot be confused with warning;
- peach/rose tint: brand-adjacent supporting content.

These roles are **visual grouping**, not lifecycle truth.

### 5.5 Semantic colour is separate

Never use the decorative accent palette to redefine status meaning.

- `live` has one consistent live treatment;
- `success/ready/healthy` has one semantic success treatment;
- `warning/reconnecting/degraded` has one warning treatment;
- `danger/failed/destructive` has one danger treatment;
- `info` has one informational treatment.

A lavender card does not mean a new lifecycle state. A mint tile does not automatically mean healthy.

### 5.6 Colour-count discipline

For an ordinary screen:

- cream + white/neutral + near-black are the foundation;
- dusty pink is the main brand accent;
- normally use no more than 1–2 supporting accent families in the same visible region;
- semantic colours appear only when real state requires them.

Do not create a rainbow dashboard.

---

## 6. Surface, border, radius and shadow rules

The hybrid system is neither flat generic SaaS nor the old hard-shadow poster system.

### Surfaces

- page = cream dotted;
- primary operational surfaces = white/warm-white;
- secondary surfaces = soft neutral or pale accent tint;
- dense table/list rows = usually border/divider only.

### Borders

Use light neutral borders for ordinary structure and stronger contrast for selected/focus/important boundaries.

### Radius

Use restrained radius, generally 6–10px for normal panels and controls. Small chips/badges may be more rounded. Avoid 20–28px radius everywhere.

### Shadows

- tables and nested rows: usually no shadow;
- ordinary card: none or subtle shadow;
- dropdown/search palette: modest floating shadow;
- modal: stronger but still soft elevation;
- optional DigiStream hard-offset shadow may survive only as a **rare signature accent** on a hero/marketing panel or intentionally emphasized brand moment, never on every operational component.

---

## 7. Required Beautiful UI -> DigiStream mapping

### 7.1 Sidebar Nav -> Creator shell

Use Beautiful UI's compact workspace-navigation idea for DigiStream's creator shell.

Likely real responsibilities:

```text
WORKSPACE
Overview
Broadcasts
Studio
Recordings
Analytics          # only when trustworthy and enabled

AUDIENCE / PRODUCTION
Studio Lobby       # when applicable
Chat               # when distinct
Guests             # when applicable

ACCOUNT
Account
Settings
```

Rules:

- map only to real routes/responsibilities;
- navigation rows are compact, not cards;
- active state may use warm-white surface + dusty-pink punctuation or pale tint;
- counts use small badges;
- workspace selector uses real organization memberships;
- mobile uses the validated mobile navigation pattern.

### 7.2 Search -> command search and resource search

Use for:

- broadcasts;
- recordings;
- workspace switch;
- authorized navigation;
- safe quick actions.

A future `Ctrl/Cmd + K` command search may expose actions such as:

- Create broadcast;
- Open Studio;
- Open current live broadcast;
- Find broadcast;
- Find recording;
- Switch workspace;
- Open settings.

All results/actions must be authorized and API-backed.

### 7.3 Task Rows -> readiness, progress and recovery

Use for real staged work:

```text
Getting your broadcast ready
✓ Channel configured
✓ Microphone detected
● Connecting private Studio
○ Checking public delivery
○ Ready to go live
```

or:

```text
Broadcast health
✓ Studio connection        Healthy
✓ Microphone               Connected
● Public stream            Reconnecting
✓ Recording                Active
```

Rules:

- stage state comes from real evidence;
- percentage only when measurable;
- scheduled waiting is not animated as active work;
- microphone/private contribution/public delivery remain separate.

### 7.4 Filter Table -> Broadcasts and Recordings

Prefer filterable rows/tables when users compare records.

Broadcasts example:

```text
[All] [Live] [Scheduled] [Draft] [Completed]

Broadcast          Channel       Date            Status
Sunday Service     Main Radio    Today 19:00     Live
Morning Devotion   Devotional    Tomorrow        Scheduled
Youth Connect      Youth         Aug 09          Completed
```

Recordings example:

```text
[All] [Processing] [Ready] [Published] [Failed]

Recording          Duration      Created         Status
Sunday Service     1h 42m        Aug 10          Ready
Morning Devotion   38m           Aug 09          Published
Youth Connect      —             Aug 08          Processing
```

Desktop uses aligned columns. Mobile transforms to compact stacked record rows rather than forcing desktop-table horizontal scroll for the main workflow.

### 7.5 Records Table -> admin/management records

Strong candidates:

- team members;
- invitations;
- channels;
- sessions;
- admin users;
- recordings.

Use compact tags/status and contextual row actions.

### 7.6 Loading State -> asynchronous work

Adapt Beautiful UI's calm loading pattern for:

- Studio connection;
- device permission/discovery;
- delivery start;
- recording processing;
- session restoration;
- slow data load.

Examples:

```text
Connecting to Studio
Establishing secure connection…     3.4s
```

and only when measurable:

```text
Processing recording
74%
Encoding audio…
```

Never invent progress.

### 7.7 Approval Card -> consequential actions

Use for:

- End broadcast;
- Delete recording;
- Remove participant;
- Suspend user;
- revoke session;
- other destructive or live-critical actions.

Example:

```text
End this broadcast?
Listeners will be disconnected and recording processing may begin.

Keep broadcasting     End broadcast
```

Use explicit action labels, never vague `Confirm`/`Yes` copy.

### 7.8 Chat -> Studio Lobby / live communication

Use Beautiful UI's compact chat hierarchy, not its AI reasoning behavior.

- compact messages;
- clear sender/body/time hierarchy;
- restrained message surfaces;
- composer reachable with keyboard open;
- moderation actions secondary;
- no AI-thinking trace inside human chat.

### 7.9 Context Cards -> selected-resource context

Use compact context panels for:

- channel;
- broadcast;
- guest;
- recording source;
- delivery summary;
- workspace context;
- secondary technical details.

Do not duplicate the entire page in a context card.

### 7.10 Insight Cards -> trustworthy analytics

Use only when data exists.

Possible examples:

- peak listeners;
- average listening duration;
- replay plays;
- retention;
- comparison with previous broadcast.

Insight cards can use restrained mixed accents: e.g. pink primary series, lavender or sky secondary series, mint/amber only where interpretation remains clear.

No fake zeroes, fake trends or placeholder growth percentages.

### 7.11 Recommendation Card -> evidence-backed guidance

Use sparingly for real recommendations such as:

- detected microphone issue with a real alternative device;
- recoverable delivery failure;
- overdue scheduled broadcast with valid options;
- recording ready for an authorized next action.

Do not show AI-like confidence percentages without a real calibrated model contract.

### 7.12 Tool Chips -> secondary diagnostics

Use compact chips for supporting technical information such as:

- selected microphone;
- contribution connected;
- public delivery reconnecting;
- recording processing;
- fallback transport when relevant.

Do not expose provider/infrastructure noise to ordinary users by default.

### 7.13 Selection Actions -> real bulk operations

Only show selection controls if the product actually supports a bulk action.

Checkboxes are not decoration.

---

## 8. Screen architecture

### Creator Overview

Overview must answer:

1. What is happening now?
2. What should I do next?
3. What is blocked or recovering?

Preferred hierarchy:

1. concise header;
2. one state-aware primary action;
3. current/live/recovering broadcast context;
4. next scheduled/draft item;
5. task/readiness rows when work is in progress;
6. recent broadcasts/recordings as compact rows;
7. trustworthy insights only when available;
8. secondary actions with lower visual weight.

The cream dotted canvas remains behind the Overview. Inner content uses warm-white/white and occasional pale accent surfaces.

### Broadcasts

Prefer:

- page header + create action;
- filter tabs/chips;
- compact table/rows;
- lifecycle-specific row actions;
- clear empty state.

Avoid giant repeated cards.

### Studio

Studio is operational software.

Use a solid calm inner workspace on top of/within the cream shell where necessary. The dotted canvas may remain visible in outer gutters/header/shell but should not compete with operational controls.

Primary regions:

- resource identity;
- microphone/device readiness;
- private contribution;
- public delivery;
- live state/duration when real;
- critical action;
- bounded recovery;
- secondary diagnostics.

### Recordings

Use searchable/filterable rows with title, context, duration, created/completed time, process/publish state and contextual action.

### Analytics

Use Beautiful UI-style insight density plus DigiStream's cream/brand identity. Mixed accent colours are welcome **only with disciplined mapping and real data**.

### Settings/Admin

Use sections, compact rows and tables. Avoid putting every preference in a giant decorative card.

---

## 9. Density and spacing

DigiStream should feel efficient, not sterile and not cramped.

Guidelines:

- page padding: roughly 16–24px mobile, 24–40px desktop;
- major section gap: roughly 24–40px;
- panel padding: roughly 16–24px;
- compact row vertical padding: roughly 10–14px;
- controls: roughly 36–44px depending on context;
- touch targets must remain accessible;
- use whitespace/dividers before wrapping every group in another card;
- avoid duplicate headings and unnecessary vertical wrappers.

Do not implement mobile as `desktop stacked forever` if it causes excessive vertical travel.

---

## 10. Typography

Use readable application typography with clear hierarchy.

- primary sans-serif for ordinary UI;
- mono only for technical metadata/IDs/diagnostics where useful;
- avoid oversized marketing headings in operational screens;
- use weight and spacing more than novelty fonts;
- labels remain concise;
- long content must wrap/truncate intentionally and accessibly.

The cream/dotted identity does not require every label to be typewriter-styled.

---

## 11. Motion

Beautiful UI's calmness comes partly from restraint.

Required:

- immediate hover/pressed/focus acknowledgement;
- short state transitions;
- no fake success before server/media confirmation;
- no fake progress;
- reduced-motion support;
- no continuous decorative particles/parallax/glow;
- scheduled content never pulses as though live;
- reconnect/live animation represents real state.

Use `PREMIUM_INTERACTION_MOTION_AND_PRODUCT_POLISH.md` for full motion authority.

---

## 12. Responsive behavior

Every adapted pattern needs explicit desktop and mobile behavior.

Validate at minimum where applicable:

- small Android portrait;
- large phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation required by CI;
- 200% zoom where current acceptance tests cover it.

Rules:

- no ordinary horizontal overflow;
- desktop tables become compact mobile record rows where needed;
- sidebar becomes the validated mobile navigation pattern;
- sticky/fixed actions reserve content clearance;
- virtual keyboard does not hide active input/composer/critical action;
- Back/Escape closes the correct top layer;
- focus restores correctly.

---

## 13. Accessibility

Beautiful UI inspiration never overrides accessibility.

Required:

- semantic HTML;
- visible focus;
- keyboard-complete operation;
- accessible names for icon-only controls;
- usable touch targets;
- sufficient contrast;
- status not communicated by colour alone;
- logical headings;
- correct table headers/relationships;
- reduced motion;
- dialog/sheet focus trap and restoration;
- careful live-region announcements for meaningful async state.

---

## 14. Shared-component architecture

Do not implement Beautiful UI patterns as page-local copies.

Prefer shared primitives under `apps/web/src/design-system/` such as equivalents of:

```text
Button
IconButton
Badge
StatusDot
Sidebar
NavItem
CommandSearch
PageHeader
SectionHeader
TaskRow
TaskList
DataTable
ResponsiveRecordRow
FilterTabs
EmptyState
LoadingState
ConfirmationDialog / ApprovalCard
SearchField
Toolbar
MessageRow
Composer
ContextPanel
InsightCard
SelectionBar
```

Reuse existing equivalents before creating new names.

Generic design-system components own presentation behavior. Feature/domain code owns authorization, lifecycle, recording and media truth.

---

## 15. Migration protocol for agents

Before changing a DigiStream UI surface:

1. read root and scoped `AGENTS.md` files;
2. read `DIGISTREAM_UI_CONSTITUTION.md`;
3. read this document;
4. read `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
5. identify the current component/API/domain owner;
6. identify the Beautiful UI pattern that actually fits;
7. open `https://beautiful-ui-five.vercel.app/` when network access is available;
8. if offline, use this document rather than guessing the external reference from memory;
9. inspect the relevant 50-screen reference for product composition/journey intent;
10. inventory shared primitives before creating another component;
11. define colour role, including which supporting accent is used and why;
12. define desktop/mobile behavior;
13. cover loading/empty/error/unauthorized/offline/recovery states;
14. implement the smallest reusable change;
15. run type, unit, build and responsive tests;
16. do not weaken product/copy/accessibility tests merely to make a redesign pass;
17. document deliberate deviations in the PR.

---

## 16. External-source and licensing rule

Beautiful UI is an external design reference.

Agents may use publicly visible interaction and visual ideas as inspiration. Do **not** paste substantial source code, proprietary assets, illustrations or icons unless the applicable license has been verified and repository notices are updated where required.

When uncertain, reimplement the pattern using DigiStream's own React/CSS/design-system architecture.

---

## 17. Acceptance checklist

A Beautiful UI-inspired DigiStream change is incomplete unless applicable answers are yes:

- Is the cream dotted DigiStream canvas still present where the ordinary application shell calls for it?
- Are white/neutral surfaces used to create clean contrast against the cream canvas?
- Is dusty pink still the principal brand accent?
- Are supporting colours restrained and intentionally mapped rather than random?
- Are lifecycle semantic colours kept separate from decorative accents?
- Does the change solve a real DigiStream responsibility?
- Does it reuse an existing surface rather than create a duplicate?
- Is information density more efficient without becoming cramped?
- Is there one clear primary action?
- Are repeated records rows/tables when comparison matters?
- Are all statuses and progress indicators truthful?
- Are destructive actions explicit and appropriately confirmed?
- Is mobile usable without ordinary horizontal overflow or excessive vertical travel?
- Are keyboard, focus, touch, Back/Escape and reduced-motion behaviors correct?
- Are authorization/data boundaries preserved?
- Are shared components reused?
- Were AI-specific patterns avoided unless an actual AI feature exists?
- Does CI remain green?

The visual identity should feel like **DigiStream using Beautiful UI-quality interaction grammar**, not Beautiful UI with a DigiStream logo pasted on it.
