# DigiStream Visual Migration Plan

Purpose: migrate the existing web implementation to the approved final 50-screen DigiStream visual system **without** creating duplicate product flows, breaking backend truth, or rewriting the application as one unsafe visual mega-change.

This plan is subordinate to root product/quality requirements and uses `DIGISTREAM_UI_CONSTITUTION.md` as the visual contract.

## Migration principle

The target is not “make screenshots.” The target is to move the existing product surfaces and shared design system into the visual language demonstrated by the 50 references while preserving real behavior.

Do not build a second application beside the existing one.

## Phase 0 — inventory before editing

Before changing CSS:

1. inventory current tokens in `apps/web/src/design-system/`;
2. identify legacy dark/emerald assumptions;
3. identify duplicated raw colors, shadows, radii, font stacks, and backgrounds outside the shared design system;
4. map current creator/listener/public shells;
5. map each existing route/component to the numbered reference index;
6. identify reference screens that represent states rather than separate routes;
7. record current responsive tests and screenshots so regressions can be detected.

Deliverable: a short migration matrix in the implementation PR description or companion document.

## Phase 1 — shared visual foundation

Migrate shared tokens/primitives before page-by-page polish:

- canvas/background grid;
- surface colors;
- ink and muted text;
- dusty-pink palette;
- semantic success/warning/danger;
- typography families and scale;
- restrained 6–10px operational radii;
- border system;
- restrained elevation hierarchy;
- focus-visible treatment;
- buttons;
- inputs/selects/textareas;
- cards;
- icon tiles;
- status badges;
- tabs/segmented controls;
- modal/sheet base treatment.

Acceptance:

- no oversized 20–28px generic rounded-card primitive remains as the default;
- no legacy green/blue primary button remains as the default;
- rows/tables use borders rather than repeated card shadows and hard-offset shadow remains rare;
- existing behavior/tests still pass.

## Phase 2 — application shells

Realign the shells before individual page polishing.

### Public shell
Reference anchors: 05, 13, 14, 15, 16, 20, 31, 40, 41, 42, 43, 44, 45, 46, 47, 48.

Goals:

- cream dotted canvas;
- consistent DigiStream header;
- Discover/Replays/Sign in presentation;
- listener account state when authenticated;
- player/discovery surfaces inherit common typography and controls.

### Creator shell
Reference anchors: 01, 02, 03, 04, 10, 11, 12, 18, 21–27, 32–39, 49, 50.

Goals:

- stable creator header/account/workspace treatment;
- stable mobile bottom navigation;
- creator page heading rhythm;
- consistent major-card width/padding;
- correct dense-screen shadow hierarchy.

### Listener shell
Reference anchors: 13–17, 19, 20, 41–48.

Goals:

- stable listener navigation;
- playback-first hierarchy;
- consistent sign-in prompts;
- request-to-speak interaction consistent with listener context.

## Phase 3 — authentication and onboarding

Reference anchors: 06–12, 26, 28–30, 45, 46.

Order:

1. login;
2. signup choice;
3. signup form;
4. intent selection;
5. organisation step;
6. channel step;
7. broadcast step;
8. invitation acceptance;
9. password recovery;
10. email verification.

Rules:

- reuse current auth/business logic;
- preserve returning-state behavior;
- do not invent browser-only onboarding completion;
- use one obvious primary action per step;
- retain full keyboard/mobile form usability.

## Phase 4 — creator operational journey

Reference anchors: 01, 02, 03, 35, 36, 39, 40.

Order by user journey:

1. Overview next action;
2. Broadcasts list/create/manage;
3. Studio Lobby/readiness;
4. Studio operational surface;
5. Backstage/call-ins;
6. live/reconnecting state;
7. end-broadcast confirmation;
8. post-broadcast continuity.

Do not change lifecycle semantics for visual fidelity.

## Phase 5 — chat, recordings and content management

Reference anchors: 04, 14, 15, 19, 37.

Goals:

- dense rows use borders more than large shadows;
- artwork sits inside the approved surrounding UI language;
- search/filter/control grammar is consistent;
- replay availability remains real and authorized.

## Phase 6 — settings/admin/account

Reference anchors: 18, 21–27, 32, 34.

Goals:

- common settings card grammar;
- role/permission actions remain truthful;
- destructive areas isolated;
- session/security information clearly distinguished from ordinary profile preferences;
- workspace switcher follows the approved compact shared-control language.

## Phase 7 — listener discovery and playback

Reference anchors: 13–17, 19, 20, 31, 40–48.

Goals:

- one coherent discovery visual language;
- artwork may vary while UI chrome remains cream/pink/ink;
- playback controls remain obvious and accessible;
- chat/request-to-speak does not obscure player state;
- live/scheduled/replay states never visually collapse into one another.

## Phase 8 — analytics and statistics

Reference anchors: 38, 49, 50.

Only implement metrics with trustworthy sources.

Rules:

- dusty pink primary series;
- charcoal/pale-pink secondary series;
- green only for semantic health/success;
- mono labels;
- cream bordered chart cards;
- no rainbow or default blue chart palette;
- unavailable metrics are omitted/explained rather than fabricated.

## Phase 9 — visual reconciliation

After all required surfaces are migrated:

1. search the web app for legacy blue/green/dark theme tokens;
2. search for large rounded radii;
3. search for blurred shadows;
4. search for old Echoo visual naming where it affects styling;
5. identify one-off component colors not represented in the Constitution;
6. compare all implemented surfaces against their reference images;
7. test Android portrait, short landscape, desktop, keyboard, focus, long text, and reduced motion;
8. remove obsolete visual code only after confirming it is unused.

## Pull-request sizing

Prefer bounded PRs by foundation/shell/journey. Avoid a single repository-wide visual rewrite that is impossible to review.

A good migration PR should:

- name the reference screens it targets;
- name shared primitives changed;
- state which existing components/routes were reused;
- show responsive evidence;
- preserve real state tests;
- disclose deliberate visual deviations;
- leave the repository in a valid buildable state.

## Definition of visually migrated

A surface is migrated only when:

- it uses the approved shared tokens;
- it uses the correct shell;
- it has cream/pink/ink visual identity;
- operational radius geometry is consistent;
- restrained elevation and border hierarchy are correct;
- typography hierarchy matches the system;
- all real states remain accurate;
- mobile/desktop behavior works;
- accessibility is preserved;
- it has been compared against the relevant numbered reference.

Changing only the background color or primary button does not count as migration.
