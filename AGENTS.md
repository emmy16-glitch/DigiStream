# DigiStream contributor and implementation-agent instructions

This file is the root authority entrypoint for human contributors and coding agents.

## 1. Product-truth authority

Before changing product behavior, read the relevant current documents, especially:

1. `docs/PRODUCT_QUALITY_AND_RELIABILITY_STANDARD.md`
2. `docs/CREATOR_ONBOARDING_AND_ACTIVATION.md`
3. `docs/PRODUCT_DESIGN_AND_FLOW_HARDENING.md`
4. `docs/PREMIUM_INTERACTION_MOTION_AND_PRODUCT_POLISH.md`
5. `docs/PRODUCT_SPECIFICATION.md`
6. `docs/ROADMAP.md`
7. `docs/ARCHITECTURE.md`
8. feature-specific documentation, contracts, migrations, routes, tests and current implementation

Backend/API truth always controls authorization, tenant isolation, lifecycle, media readiness, recording/replay availability, privacy and reliability.

Never fabricate product state to satisfy a screenshot or design reference.

## 2. Frontend/UI authority

For every frontend/UI/UX/design-system change, read in this order:

1. `docs/design/DIGISTREAM_UI_V2_COMPLETE_SPEC.md`
2. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`
3. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
4. `docs/design/DESIGN_TOKENS.md`
5. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
6. `docs/design/REFERENCE_INDEX.md`
7. the relevant numbered reference screen(s) for screen responsibility, journey and composition intent
8. `apps/web/AGENTS.md`

External Beautiful UI reference:

`https://beautiful-ui-five.vercel.app/`

Beautiful UI is a component/density/interaction reference, not a product to clone.

**Legacy visual wording inside older product/behavior documents is historical presentation language only.** Phrases such as `Echoo light`, legacy dark/emerald styling, screenshot-era square/hard-shadow language, or old font terminology do not override the UI V2 presentation authority above. Those documents remain authoritative for the product behavior, lifecycle, reliability or flow they define; `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` controls current reusable presentation.

## 3. Final visual direction

The active DigiStream visual system is:

> warm cream dotted application canvas + clean white/warm-white operational surfaces + dusty-pink primary brand accent + restrained lavender/sky/mint/amber/peach supporting tints + compact Beautiful UI-quality component grammar + modern readable sans-serif typography.

The following are **obsolete and must not be restored**:

- default dark/emerald application theme;
- generic blue/white SaaS styling;
- square cards/controls everywhere;
- hard black offset shadows everywhere;
- monospace/typewriter buttons, nav labels, forms and ordinary product copy;
- giant cream/pink card stacks;
- 20–28px radius everywhere;
- Inter-everywhere generic styling;
- AI-agent Thinking/reasoning/prompt UI in ordinary DigiStream product screens.

## 4. Branding

User-visible product branding is **DigiStream**.

Do not leave visible `Echoo` branding in landing, auth, footer, headers, system states or product copy. Internal legacy class/file names may remain temporarily if renaming them would create unrelated risk, but visible UI must be DigiStream.

## 5. Product priority and programme order

Safely finish active work, then follow the mandatory product sequence already defined by the product docs:

1. creator onboarding and activation;
2. product design and flow hardening;
3. premium interaction, motion and polish.

Do not use visual redesign as permission to skip broken onboarding, lifecycle, authorization or media-readiness foundations.

## 6. Required creator journey

The intended real journey is:

```text
Create account
-> choose Broadcast audio or Listen to broadcasts
-> listener reaches listener discovery without organisation creation
-> creator creates organisation
-> creator creates/activates first authorized channel
-> creator creates or schedules first broadcast
-> Studio opens only with valid context
-> Studio verifies microphone, private contribution and public delivery separately
-> Go live waits for authoritative readiness
-> completion shows only real recording/replay/share next actions
```

A missing backend foundation does not permit fake UI.

## 7. Reuse and anti-duplication

Reuse and realign existing responsible surfaces and APIs.

Do not create:

- second creator dashboard;
- duplicate onboarding app;
- duplicate organisation/channel/broadcast forms;
- second Broadcasts page;
- second Studio;
- second Backstage/Lobby;
- second Recordings workspace;
- disconnected fake analytics/completion/replay pages;
- client-side lifecycle or authorization shortcuts;
- a second component library that only renames existing primitives.

Generic design-system components own presentation; domain code owns authorization/lifecycle/media truth.

## 8. UI V2 completion rule

Changing colours, radius and shadows is not a complete redesign.

The UI V2 migration must continue until applicable shared ownership exists for:

- compact creator sidebar/navigation;
- modern typography;
- PageHeader/SectionHeader;
- Search/CommandSearch;
- FilterTabs;
- DataTable/ResponsiveRecordRow;
- TaskRow/TaskList;
- Loading/Empty/Error/Offline/Unauthorized states;
- Approval/Confirmation;
- ContextCard;
- InsightCard;
- MessageRow/Composer;
- shared modal/sheet behavior;
- responsive landing/footer composition.

The complete screen-by-screen contract is in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.

## 9. No blind bulk visual rewrites

Do not use broad regex/perl/sed replacements across unrelated frontend files for colours, radii, shadows, typography, spacing or geometry.

Change shared tokens/primitives deliberately, then migrate individual surfaces and inspect their output.

## 10. State integrity

Never show fake:

- listener counts;
- analytics;
- duration;
- health/readiness;
- progress percentages;
- recordings;
- replay availability;
- permissions;
- success.

Scheduled is not live. Microphone signal is not public delivery. Private Studio contribution is not public listener delivery. Completed broadcast is not automatically recording-ready.

## 11. Responsive/accessibility acceptance

Affected surfaces must be checked for:

- ~360px Android portrait;
- 390–430px large-phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where tests require it;
- 200% zoom-equivalent cases where covered;
- virtual keyboard open/closed;
- long names/text/URLs;
- browser/Android Back and Escape;
- focus visibility/restoration;
- no ordinary horizontal overflow;
- at least practical 44px mobile touch targets.

Loading, disabled, error and recovery states must remain understandable.

## 12. Tests and CI

Before merge, run the repository-required checks, including applicable:

- typecheck;
- API/unit tests;
- production build;
- Node 22 and Node 24 validation;
- responsive Playwright;
- desktop Chromium;
- Android Chrome;
- Android desktop-site cases;
- short-height landscape;
- accessibility-sensitive tests.

Do not delete, skip or weaken a test merely to make a redesign pass. When an old test truly conflicts with a new authoritative product/design contract, update the implementation, documentation and test together and explain why.

## 13. Reporting

Report only meaningful completed behavior, test evidence or a specific blocker.

Distinguish:

- implemented and automated-test verified;
- manually verified;
- documented but not implemented;
- blocked by missing external/data/device foundations.

Do not declare UI V2 complete while major Beautiful UI component families, landing/footer quality, modern typography, stale branding or required responsive/CI work remains unfinished.
