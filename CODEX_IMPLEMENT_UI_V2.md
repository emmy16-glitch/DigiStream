# Codex Master Task — Implement DigiStream UI V2 End to End

Status: **ACTIVE IMPLEMENTATION TASK**

This file exists so a coding agent can execute the complete DigiStream UI migration in one continuous task without repeatedly asking the user what to do next.

## 0. Execution mode

This is **not** a planning-only task.

When instructed to execute this file, Codex must:

1. read the repository instructions and authoritative design/product documents;
2. inspect the current implementation and current PR branch;
3. implement the required UI system and migrate the existing product surfaces;
4. run tests, typechecks, builds, and responsive acceptance throughout the work;
5. fix regressions caused by the migration;
6. continue through every implementation phase in this file without stopping after a plan, audit, first screen, or first component;
7. stop only when the defined completion gates pass or a genuine external blocker exists that cannot be solved inside the repository.

Do not ask for confirmation between phases. Use judgment within the repository contracts.

A single Codex task may use multiple internal implementation phases and commits. "Implement everything at once" means **one continuous autonomous engineering task**, not one unsafe unreviewable code dump.

## 1. Branch and scope

Repository: `emmy16-glitch/DigiStream`

Active UI branch / PR head:

```text
ui/digistream-screens-21-50
```

Existing pull request: **#188 — Complete DigiStream 50-screen UI redesign**.

Work on the current checked-out implementation branch. Do not create a parallel DigiStream application, a second creator dashboard, a second Studio, a second Broadcasts page, or duplicate business logic merely to achieve visual fidelity.

Before editing, inspect `git status`, current branch, current head, and recent changes. Preserve unrelated valid work already on the branch.

## 2. Mandatory read order before editing UI

Read these in order:

1. root `AGENTS.md`;
2. `apps/web/AGENTS.md`;
3. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`;
4. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
5. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
6. `docs/design/DESIGN_TOKENS.md`;
7. `docs/design/REFERENCE_INDEX.md`;
8. `docs/design/DIGISTREAM_VISUAL_MIGRATION_PLAN.md`;
9. `docs/design/DESIGN_REVIEW_CHECKLIST.md`;
10. root product/lifecycle/reliability documents referenced by `AGENTS.md`;
11. feature-specific documentation and tests for the area being changed.

If an older document describes the obsolete dark/emerald system or treats the old cream-poster treatment as universally mandatory, the current UI Constitution + Beautiful UI adaptation standard control reusable presentation. Product truth, lifecycle, authorization, media readiness, privacy, and accessibility always remain authoritative.

## 3. External Beautiful UI reference

Reference URL:

```text
https://beautiful-ui-five.vercel.app/
```

If internet access is available, inspect the reference directly for interaction rhythm, density, hierarchy, table/row patterns, loading states, approval patterns, search, sidebar, chat, context cards, and insight cards.

If internet access is unavailable, **do not block**. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md` is the repository-owned canonical adaptation contract and contains the required mapping.

Do not copy source code from the external site unless its license and provenance are explicitly verified. Recreate patterns using DigiStream-owned components and styles.

## 4. Target visual system — non-negotiable hybrid rule

DigiStream must retain its own identity while gaining Beautiful UI's product discipline.

Required hierarchy:

```text
warm cream dotted DigiStream application canvas
    -> white / warm-white / subtle neutral operational surfaces
        -> dusty pink as principal DigiStream brand accent
        -> restrained lavender / sky / mint / amber / peach supporting tints
        -> fixed evidence-backed semantic live/success/warning/error/info colours
```

### Keep

- warm cream/off-white application background;
- subtle DigiStream dot grid on ordinary application canvas;
- near-black readable text;
- dusty pink as the principal brand accent;
- bold hierarchy and strong product personality;
- selected brand moments that may still use stronger borders or rare hard-offset elevation;
- semantic state colours tied to real state.

### Improve using Beautiful UI discipline

- cleaner white/warm-white surfaces;
- compact information density;
- thinner/internal borders;
- restrained nested elevation;
- calmer selected states;
- smaller status indicators;
- structured rows/tables instead of huge repeated cards;
- concise labels and secondary text;
- one dominant action per state;
- clearer loading, approval, filter, search, and chat patterns;
- deliberate supporting colour variation without turning the product into a rainbow.

### Never do

- remove the cream dotted DigiStream canvas and replace it with generic gray SaaS;
- make every surface cream/pink;
- make every nested component a giant hard-shadow card;
- use large rounded 16–24px SaaS cards everywhere;
- use glassmorphism, neon glow, glossy gradients, or random blur;
- use supporting lavender/sky/mint/amber/peach colours as invented lifecycle meaning;
- show fake metrics, fake readiness, fake progress, fake listener counts, or fake analytics;
- use AI Thinking/model/prompt/reasoning UI in ordinary DigiStream product surfaces.

## 5. Shared component system to implement/reconcile first

Inventory `apps/web/src/design-system/` and existing feature-local patterns before adding anything.

Create, consolidate, or realign shared primitives where appropriate. Reuse existing correct primitives rather than renaming them unnecessarily.

The target reusable grammar should cover the responsibilities of:

- `Button` / `LinkButton` / `IconButton`;
- `StatusBadge` / `StatusDot`;
- `PageHeader` / `SectionHeader`;
- creator `Sidebar` / mobile navigation;
- workspace/account switcher;
- `CommandSearch` / accessible search field;
- `TaskRow` / `TaskList`;
- `DataTable` / responsive compact record rows;
- `FilterTabs` / filter controls;
- `LoadingState` / determinate and indeterminate progress;
- `ApprovalCard` / confirmation dialog/sheet;
- `ContextCard` / key-value resource context;
- `InsightCard` for trustworthy analytics only;
- `EmptyState`, `ErrorState`, `OfflineState`, `UnauthorizedState`;
- `ChatMessageRow` / chat composer where existing product responsibilities support it;
- form controls;
- modal/sheet primitives with shared focus, Back/Escape, keyboard and scroll-lock behavior.

Do not introduce a second component library if the existing DigiStream design system can own the pattern.

## 6. Implementation phases — execute all in this task

### Phase A — baseline, tests, and visual foundation

1. Run/inspect the existing test and build commands before broad edits.
2. Inspect current failures on PR #188, especially product-language and responsive acceptance failures.
3. Do not weaken tests merely because the redesign changed copy or layout.
4. Fix real regressions while preserving valid product contracts.
5. Reconcile design tokens and shared CSS with the hybrid rule.
6. Ensure the cream dotted canvas remains the app foundation.
7. Add supporting tint tokens only through the shared design system.
8. Establish restrained border/radius/elevation rules.
9. Remove obsolete application-wide styling rules only after confirming they are no longer needed.

### Phase B — creator shell and navigation

Implement/reconcile the Beautiful UI-inspired navigation system using existing routes and real permissions.

Desktop creator hierarchy should support, where actually available:

```text
WORKSPACE
Overview
Broadcasts
Studio
Recordings
Analytics   # only when real/trustworthy and product docs allow

AUDIENCE
Studio Lobby
Chat
Guests

ACCOUNT
Account
Settings
```

Do not add fake destinations. Preserve validated mobile navigation rather than squeezing the desktop sidebar onto mobile.

Requirements:

- stable compact navigation rows;
- accessible active state;
- workspace/account context;
- counts only from real authorized data;
- keyboard navigation and focus-visible;
- no duplicate product navigation.

### Phase C — Creator Overview

Rebuild/reconcile Overview as a state-aware next-action dashboard, not a card gallery.

Hierarchy:

1. concise header;
2. one API-backed primary action;
3. current/next broadcast state;
4. Task Rows for real work/readiness/recovery;
5. recent broadcasts/recordings in compact rows;
6. Insights only if real analytics exist;
7. secondary actions with lower visual weight.

Preserve required product language tested by the repository, including exact accepted terminology such as `Studio Lobby` where tests/product contracts require it.

### Phase D — Broadcasts

Migrate repeated broadcast records from oversized cards to Beautiful UI-inspired Filter Table / compact responsive rows where appropriate.

Support real filters such as actual available lifecycle groups.

Rows must expose lifecycle-specific actions rather than duplicated generic Studio buttons.

Mobile must transform into compact stacked rows; ordinary use must not require horizontal desktop-table scrolling.

### Phase E — Studio / readiness / live / reconnecting

Studio is operational software.

Use Task Rows and compact Context Cards for:

- microphone readiness;
- private contribution readiness;
- public listener delivery readiness;
- current broadcast context;
- connecting/loading/recovery states;
- recording state when real.

Rules:

- microphone activity never means listeners can hear audio;
- private contribution never implies public delivery;
- Go Live success waits for authoritative confirmation;
- reconnecting is visibly distinct and evidence-backed;
- live UI becomes calmer, not more animated;
- critical controls remain reachable on small Android portrait and short landscape;
- diagnostics are progressively disclosed.

### Phase F — Studio Lobby / Backstage / Guests / Chat

Adapt Beautiful UI Chat and Context Card density to the existing human communication workflows.

Requirements:

- compact participant rows;
- clear Ready / muted / invited / on-stage states backed by real data;
- readable human chat hierarchy;
- composer remains reachable above virtual keyboard;
- moderation actions remain role-aware;
- playback/Studio audio is not unnecessarily interrupted by opening communication panels;
- do not add AI reply/reasoning UI.

### Phase G — Recordings and replay management

Use searchable/filterable Records Table / compact responsive rows.

Show only real:

- title;
- source broadcast/channel;
- duration when known;
- processing/publish/replay state;
- dates/times;
- allowed contextual actions.

Do not show fake duration or replay readiness.

### Phase H — Analytics

Only expose analytics that have trustworthy data sources and are permitted by product documentation.

Use Beautiful UI-inspired Insight Cards for decision-useful metrics rather than decorative KPI boxes.

Possible metrics only when real:

- peak listeners;
- average listening duration;
- replay plays;
- audience retention;
- broadcast-to-broadcast comparison.

Every metric needs a source and time range. Omit unavailable metrics rather than displaying fake zeroes.

### Phase I — Search / command access

Where architecture supports it without inventing routes or duplicating business logic, implement or prepare an accessible command/search pattern for authorized resources/actions.

Potential real actions:

- create broadcast;
- open current Studio;
- find broadcast;
- find recording;
- switch workspace;
- open settings.

`Ctrl/Cmd + K` is optional only if implemented accessibly and consistently. Do not expose private resources through search.

### Phase J — settings/admin/account

Replace unnecessary giant-card stacks with clear sections, compact rows, tables, and contextual confirmation.

Use Approval Card / confirmation patterns for consequential actions such as:

- ending a broadcast;
- deleting a recording;
- removing a participant/member;
- suspending an account;
- revoking a session;
- destructive workspace/admin operations.

Confirmation copy must state the actual consequence, not only `Are you sure?`.

### Phase K — authentication/onboarding/listener surfaces

Apply the hybrid visual system and Beautiful UI discipline to remaining product surfaces without rewriting their business logic.

Preserve:

- onboarding flow contracts;
- listener-first routing where applicable;
- authentication recovery/error states;
- listener playback hierarchy;
- real live/scheduled/replay distinction;
- responsive behavior;
- accessibility.

Do not force every listener/public screen into creator-dashboard layout.

### Phase L — full reconciliation

Search the frontend for:

- obsolete dark/emerald visual assumptions;
- obsolete generic blue/white styling;
- application-wide giant hard-shadow card patterns;
- duplicated one-off cards where compact rows/tables now own the responsibility;
- arbitrary feature-local colours;
- excessive radii;
- generic AI-looking UI;
- duplicate navigation/actions;
- stale `Echoo` product-language strings where they are truly obsolete **but do not rename strings that tests/product contracts intentionally preserve without checking their authority**;
- horizontal overflow and excessive mobile vertical travel.

Remove obsolete code only when safe.

## 7. Colour assignment rules

Use supporting tints intentionally.

Suggested roles, not lifecycle meanings:

- dusty pink: principal brand emphasis, selected state, primary brand action;
- lavender: secondary grouping/context/personalization;
- sky: informational grouping/filter/search context;
- mint: calm secondary context only, unless the semantic success token is specifically required;
- amber/peach: warm emphasis/grouping only, unless the semantic warning token is specifically required.

Semantic state colours remain independent:

- Live: repository-defined live treatment;
- Success/healthy/ready: semantic success;
- Warning/reconnecting/degraded: semantic warning;
- Error/failed/destructive: semantic danger;
- Info: semantic info.

A decorative tint must never silently communicate a lifecycle state.

## 8. Responsive acceptance — mandatory

Test affected surfaces across at least the repository's supported matrix:

- desktop Chromium;
- Android Chrome portrait;
- Android desktop-site simulation where tests require it;
- short-height landscape;
- 200% zoom-equivalent narrow/accessible cases where existing tests require them;
- virtual keyboard open/closed for forms/chat;
- long names/text/URLs/slugs;
- browser/Android Back;
- refresh/session recovery.

Rules:

- no ordinary horizontal page overflow;
- 44px minimum effective touch targets where required;
- fixed/sticky controls reserve content clearance;
- tables transform intelligently on mobile;
- focus remains visible;
- overlays trap and restore focus correctly;
- Back/Escape closes the correct top layer;
- reduced motion remains functional.

## 9. Testing and CI contract

Do not declare completion after screenshots look good.

Run the repository-prescribed checks from `AGENTS.md` and package scripts. At minimum, cover:

- typecheck;
- API/unit tests;
- production web build;
- Node 22 test/build path;
- Node 24 test/build path;
- responsive Playwright suite;
- relevant infrastructure/static validation when touched.

Current PR #188 previously had failures in Node 22/24 and responsive Playwright. Treat them as work to resolve, not reasons to disable tests.

Do not:

- delete failing acceptance tests simply because the design changed;
- loosen assertions without determining whether the product contract changed;
- skip a failing project/browser to get green CI;
- bypass accessibility/product-language/lifecycle checks.

When a test is genuinely obsolete because an authoritative v2 design/product contract intentionally changed, update the test and the corresponding documentation together, and make the reason explicit.

## 10. Completion definition

This Codex task is complete only when:

- the hybrid cream-dotted + Beautiful UI system is implemented in the actual frontend, not only documented;
- shared primitives own repeated patterns;
- Creator shell/navigation is coherent;
- Overview is state-aware and compact;
- Broadcasts and Recordings use appropriate filterable/record-oriented layouts;
- Studio readiness/live/recovery is clear and truthful;
- Studio Lobby/Chat/Guests use compact human-communication patterns;
- settings/admin use structured rows/tables and safe confirmations;
- analytics is either trustworthy and integrated or honestly unavailable/hidden;
- authentication/onboarding/listener surfaces remain coherent with the hybrid system;
- old conflicting visual code is reconciled;
- responsive and accessibility acceptance passes;
- required Node 22/24 checks pass;
- production build passes;
- no known required CI failure remains caused by this migration;
- documentation is reconciled with the final implementation.

## 11. Agent behavior during execution

Do not stop to say only:

- "I created a plan";
- "I updated the design system";
- "Phase 1 is complete";
- "here is what I would do next";
- "the remaining screens can be implemented later".

Continue implementing the next phase automatically.

If a command fails, diagnose and fix it. If a test exposes a real regression, fix the implementation. If a shared component causes widespread failures, correct the shared component rather than adding dozens of local hacks.

Only stop early for a real blocker such as missing credentials, unavailable external infrastructure that is strictly required for the task, an authorization boundary that cannot be exercised locally, or a repository corruption/conflict that cannot be resolved safely.

When blocked, report:

1. exactly what is blocked;
2. what was already completed;
3. the exact command/error/evidence;
4. the smallest user action needed to unblock it.

## 12. Final report required from Codex

At the end, provide a concise engineering report containing:

- major UI/system changes implemented;
- shared components added/changed;
- surfaces migrated;
- old conflicting patterns removed;
- tests/builds run and their results;
- any deliberate test/document changes and why;
- remaining real blockers, if any;
- current git status and commit(s).

Do not claim the work is complete if required checks are still failing.
