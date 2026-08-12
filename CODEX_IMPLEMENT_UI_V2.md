# Codex Master Task — Complete DigiStream UI V2 End to End

Status: **ACTIVE IMPLEMENTATION TASK**

This is an implementation task, not a planning/audit-only task.

## 0. Execution rule

When told to execute this file, Codex must:

1. inspect current branch, status, recent commits and existing implementation;
2. read the current authority chain;
3. preserve valid work already completed;
4. implement every remaining applicable UI V2 requirement;
5. run and fix typecheck/build/tests/responsive acceptance;
6. continue automatically through all incomplete phases;
7. stop only when completion gates pass or a genuine external blocker exists.

Do not ask for confirmation between phases.

Do not restart from scratch merely because the branch contains recovery/WIP commits.

Do not reset or discard existing valid implementation work.

## 1. Mandatory read order

Before editing frontend code, read:

1. root `AGENTS.md`;
2. `apps/web/AGENTS.md`;
3. `docs/design/DIGISTREAM_UI_V2_COMPLETE_SPEC.md`;
4. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`;
5. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
6. `docs/design/DESIGN_TOKENS.md`;
7. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
8. `docs/design/REFERENCE_INDEX.md`;
9. `docs/design/DIGISTREAM_VISUAL_MIGRATION_PLAN.md`;
10. `docs/design/DESIGN_REVIEW_CHECKLIST.md`;
11. relevant product/lifecycle/reliability docs;
12. feature-specific docs/tests for each area changed.

`DIGISTREAM_PRODUCT_DESIGN_BIBLE.md` is legacy/superseded and is not current visual authority.

## 2. External Beautiful UI reference

Reference:

`https://beautiful-ui-five.vercel.app/`

Use it for component grammar, information density, navigation, rows/tables, loading, approval, search, chat, context and insight patterns.

Do not clone the site or copy source without verified license/provenance.

Do not add its AI-specific Thinking/model/prompt/reasoning UI to normal DigiStream product surfaces.

## 3. Final target

The complete visual system is:

```text
warm cream dotted DigiStream canvas
    -> white / warm-white / neutral operational surfaces
        -> dusty-pink principal brand accent
        -> restrained lavender / sky / mint / amber / peach supporting tints
        -> truthful semantic live / success / warning / danger / info
        -> modern sans-serif ordinary UI
        -> compact Beautiful UI-quality component hierarchy
```

User-visible branding is **DigiStream**.

## 4. Obsolete rules — never restore

Do not implement:

- dark/emerald default application theme;
- generic blue/white SaaS;
- square cards/controls everywhere;
- hard black offset shadows everywhere;
- monospace/typewriter buttons/nav/forms/marketing/footer;
- giant all-cream/all-pink card stacks;
- 20–28px radius everywhere;
- AI-agent interface styling in ordinary product screens.

## 5. Typography — fix this explicitly

Normal product UI uses the modern sans-serif contract from the Complete Spec/Constitution.

Preferred family: Manrope with documented fallbacks.

Mono/IBM Plex Mono is technical-only.

Remove ordinary mono/typewriter styling from:

- buttons;
- nav labels;
- form labels;
- card titles;
- normal paragraphs;
- landing page;
- error/empty states;
- footer links.

Do not leave the landing hero or CTA looking like a terminal/typewriter interface.

## 6. Branding sweep

Visible branding must say DigiStream.

Audit and fix visible `Echoo` strings in:

- BrandLockup;
- landing page;
- footer;
- auth/onboarding;
- system/offline/error states;
- creator/listener shells;
- product copy/tests where obsolete branding is protected.

Internal legacy class/file names may remain when renaming them is unrelated/high-risk, but visible UI must not say Echoo.

## 7. Do not waste time redoing foundation

First inspect what previous Codex work already implemented.

If cream/dot tokens, supporting colours, radius, basic buttons, TaskRow or ContextCard already exist and are correct, **do not spend another run repeatedly tuning them**.

Prioritize missing structural component families and actual screen migration.

Changing colours/radius/shadows is not completion.

## 8. Shared component system — must be complete

Inventory `apps/web/src/design-system/` and reconcile existing components.

Before declaring UI V2 complete, applicable shared ownership must exist for equivalents of:

- Button / LinkButton / IconButton;
- StatusBadge / StatusDot;
- PageHeader / SectionHeader;
- Sidebar / NavSection / NavItem;
- mobile creator navigation;
- workspace/account switcher;
- SearchField / CommandSearch;
- FilterTabs;
- DataTable / ResponsiveRecordRow;
- TaskRow / TaskList;
- LoadingState;
- EmptyState / ErrorState / OfflineState / UnauthorizedState;
- ApprovalCard / confirmation dialog/sheet;
- ContextCard;
- InsightCard;
- MessageRow / Composer;
- SelectionBar where real;
- Modal/Sheet focus/Back/Escape/scroll-lock primitives.

Reuse existing equivalents before adding duplicates.

## 9. Implementation priority — execute all remaining phases

### Phase A — audit current recovery implementation

- inspect git diff/commits against pre-recovery baseline;
- identify which shared primitives are actually implemented;
- identify which screens only received token/CSS tweaks;
- identify modified tests and ensure they were not weakened;
- identify visible Echoo branding;
- identify ordinary mono/typewriter UI;
- identify giant-card layouts still present.

Do not stop after this audit.

### Phase B — creator shell/sidebar/navigation

Implement a real compact Beautiful UI-quality desktop sidebar using existing routes/permissions.

Where capabilities exist, organize around real groups such as:

```text
WORKSPACE
Overview
Broadcasts
Studio
Recordings
Analytics

AUDIENCE / PRODUCTION
Studio Lobby
Chat
Guests

ACCOUNT
Account
Settings
```

Requirements:

- compact rows;
- subtle selected state;
- real workspace/account context;
- truthful counts only;
- modern sans typography;
- validated mobile navigation instead of squeezed desktop sidebar.

### Phase C — Overview

Make Overview a state-aware next-action dashboard, not a card gallery.

Use:

- concise header;
- one state-aware primary action;
- current/next context;
- real Task Rows;
- recent broadcasts/recordings as compact rows;
- insights only when trustworthy.

### Phase D — Broadcasts

Implement real FilterTabs + record-oriented desktop layout + responsive mobile records.

Use lifecycle-specific row actions.

Remove giant repeated broadcast cards where comparison matters.

### Phase E — Recordings

Implement searchable/filterable record-oriented layout with real processing/replay state and responsive rows.

### Phase F — Studio

Use calm operational surfaces and compact readiness/context rows for:

- selected org/channel/broadcast;
- microphone;
- private Studio contribution;
- public listener delivery;
- live/reconnecting;
- recording when real.

Critical controls remain stable/reachable.

No fake percentages or implied public delivery.

### Phase G — Studio Lobby / Backstage / Guests / Chat

Implement compact participant/message hierarchy, role-aware actions, keyboard-safe composer and context panels.

No AI reasoning/model UI.

### Phase H — Analytics

Use Insight Cards only for trustworthy source/scope/time-range metrics. Hide/unavailable if not trustworthy.

### Phase I — Account / Settings / Team / Admin

Replace giant card stacks with structured sections/rows/tables. Use explicit Approval/Confirmation for consequential actions.

### Phase J — Auth / onboarding

Use modern sans typography, compact forms, one primary action, DigiStream branding and correct keyboard/error behavior.

### Phase K — Landing page — explicit correction required

The current card-heavy landing layout is not acceptable completion.

Implement the contract in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`:

1. compact responsive header;
2. controlled hero;
3. hero headline roughly 42–48px on common mobile widths, not nearly full-viewport poster scale;
4. concise body copy;
5. clear primary/secondary CTA;
6. one purposeful visual/proof element;
7. compact capability rows/tiles instead of four huge stacked cards;
8. compact three-step journey instead of tall numbered poster cards;
9. meaningful supporting sections only;
10. one final CTA;
11. grouped responsive footer;
12. footer uses DigiStream branding and clear Product/Company/Legal grouping;
13. no randomly floating links;
14. no mono/typewriter CTA/footer typography.

### Phase L — Listener/public/guest surfaces

Apply modern typography and compact hierarchy without forcing creator-dashboard layout. Preserve playback-first behavior and truthful live/scheduled/replay state.

### Phase M — loading/offline/error states

Fix shared system states.

Mandatory regression fix:

- connectivity banner buttons such as `Dismiss`/`Retry` must never collapse into vertical letters;
- mobile layout deliberately stacks message/action when necessary;
- blocking state content uses compact centered width instead of giant empty poster layout where appropriate.

### Phase N — Search / CommandSearch

Where real architecture supports it, add accessible authorized command/resource search for real actions/resources such as create broadcast, current Studio, broadcast/recording lookup, workspace switching and settings.

### Phase O — final reconciliation

Search the frontend/tests for:

- visible Echoo branding;
- old dark/emerald assumptions;
- generic blue branding;
- ordinary mono/typewriter UI;
- giant repeated cards;
- hard shadows;
- excessive radius;
- duplicate actions/navigation;
- horizontal overflow;
- stale tests protecting obsolete presentation.

Fix deliberately. Do not mechanically replace everything.

## 10. No blind bulk visual rewrites

Do not run broad `perl`, `sed` or regex replacements across dozens of files to normalize radius, shadows, colours, spacing or typography.

Shared tokens/primitives first, then deliberate surface migration.

## 11. Product truth

Never fabricate:

- listener counts;
- analytics;
- duration;
- lifecycle state;
- readiness;
- progress percentages;
- recording/replay availability;
- permissions;
- success.

Scheduled is not live. Microphone is not private contribution. Private contribution is not public delivery. Completed broadcast is not automatically recording-ready.

## 12. Test discipline

Audit every test modified by previous recovery work.

Do not weaken tests merely to make the redesign pass.

When an old test genuinely conflicts with the new authoritative contract:

- verify the current doc contract;
- update implementation + test together;
- preserve lifecycle/authorization/accessibility/responsive intent;
- document the intentional change.

## 13. Responsive acceptance

Check affected surfaces at minimum for:

- ~360px Android portrait;
- 390–430px phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where covered;
- 200% zoom-equivalent cases where covered;
- virtual keyboard open;
- long text/names/URLs;
- Back/Escape/focus restoration;
- no ordinary horizontal overflow.

## 14. Validation

Run applicable repository checks including:

- typecheck;
- unit/API tests;
- production build;
- Node 22;
- Node 24;
- responsive Playwright;
- desktop Chromium;
- Android Chrome;
- Android desktop-site cases;
- short-height landscape;
- accessibility-sensitive tests.

Fix implementation failures instead of hiding them.

## 15. Checkpoint discipline

Because long mobile/Termux Codex sessions may exit unexpectedly, create and push meaningful checkpoint commits during long implementation work.

Do not leave hours of valid work only in the working tree when a coherent implementation checkpoint exists.

Do not commit obviously broken half-edits solely for frequency; checkpoint after coherent groups and report their status honestly.

## 16. Completion definition

Do not declare UI V2 complete until all applicable gates in `docs/design/DIGISTREAM_UI_V2_COMPLETE_SPEC.md` and `DESIGN_REVIEW_CHECKLIST.md` pass.

In particular, completion requires:

- DigiStream branding reconciled;
- modern sans ordinary UI;
- landing/footer corrected;
- creator sidebar/navigation implemented;
- Broadcasts/Recordings record-oriented layouts;
- Studio truthful compact hierarchy;
- Lobby/Backstage/Guests/Chat compact communication patterns;
- missing shared Beautiful UI component families implemented where applicable;
- error/offline responsiveness fixed;
- responsive/accessibility acceptance;
- required CI green.

At the end report:

1. shared primitives implemented/changed;
2. screens/surfaces migrated;
3. stale branding removed;
4. typography changes;
5. landing/footer changes;
6. tests executed and exact results;
7. any genuine remaining blocker;
8. final git status and commits.

Do not merge PR #188 automatically unless the user explicitly instructs it and required checks are green.
