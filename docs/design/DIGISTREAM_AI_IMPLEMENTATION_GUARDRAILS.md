# DigiStream AI Implementation Guardrails

This file governs Codex, Claude Code, Cline, Copilot and other implementation agents working on DigiStream UI.

## 1. Mandatory read order

Before frontend/UI/UX/design-system work, read:

1. `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`
2. `DIGISTREAM_UI_CONSTITUTION.md`
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
4. `DESIGN_TOKENS.md`
5. `REFERENCE_INDEX.md`
6. relevant numbered reference screens for composition/journey intent
7. `apps/web/AGENTS.md`
8. product-truth/lifecycle/reliability docs from root `AGENTS.md`
9. current implementation and tests

Do not implement from memory after glancing at one screenshot.

## 2. Product truth versus presentation

Presentation authority never overrides:

- authorization;
- tenant isolation;
- lifecycle transitions;
- media readiness;
- recording/replay availability;
- privacy/security;
- real analytics/data availability;
- accessibility/reliability.

A visually accurate lie is still a bug.

## 3. Current visual signature

Required:

- warm cream/off-white dotted canvas;
- white/warm-white operational surfaces;
- dusty-pink primary brand accent;
- near-black text;
- restrained lavender/sky/mint/amber/peach supporting tints;
- modern readable sans-serif ordinary UI;
- mono only for technical metadata/diagnostics;
- 6–10px ordinary operational radius;
- subtle borders/dividers;
- restrained shadow;
- compact Beautiful UI-quality rows/tables/search/task/loading/approval/chat/context/insight patterns;
- DigiStream user-visible branding.

## 4. Absolute visual prohibitions

Do not introduce or restore:

- legacy dark/emerald default theme;
- generic blue/white SaaS;
- square cards/controls everywhere;
- hard black offset shadows everywhere;
- monospace/typewriter buttons, nav labels, forms, normal paragraphs, marketing copy or footer links;
- giant repeated cream/pink cards;
- 20–28px radius everywhere;
- glassmorphism/frosted panels;
- gradient-heavy primary UI;
- neon/glow decoration;
- AI Thinking/model/prompt/reasoning UI in normal product surfaces;
- arbitrary feature-local colours where shared tokens exist.

## 5. Branding guardrail

Visible product name is **DigiStream**.

Remove stale visible `Echoo` branding from landing, auth, footer, headers, system states and product copy. Internal compatibility names may remain temporarily if changing them creates unrelated risk.

Do not keep obsolete Echoo branding only because a stale test asserts it. Reconcile the test with the current product contract when appropriate.

## 6. Component-first rule

Do not recreate each screen as isolated CSS.

Shared ownership must cover applicable equivalents of:

- buttons/icon buttons;
- status badges/dots;
- page/section headers;
- sidebar/nav items;
- mobile navigation;
- workspace/account switcher;
- search/command search;
- filter tabs;
- data table/responsive record row;
- task row/list;
- loading/empty/error/offline/unauthorized states;
- approval/confirmation;
- context card;
- insight card;
- message row/composer;
- modal/sheet behavior;
- selection actions when real.

If three surfaces use the same visual responsibility, reuse or build a shared primitive instead of copy/paste.

## 7. Beautiful UI adaptation rule

Borrow Beautiful UI's density, alignment and component grammar where they map to real DigiStream responsibilities.

Do not copy AI-specific patterns or clone the site.

The 50-screen references remain useful for screen responsibility, journey, content grouping and relative hierarchy. They do not override current typography, component density, radius, shadow, table/row, landing/footer or shared-system rules.

## 8. Landing-page guardrail

The landing page must follow the explicit section contract in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.

Reject implementations that contain:

- poster-scale mobile headline that consumes nearly the whole first viewport;
- giant vertical feature-card stacks;
- tall numbered cards for a simple three-step flow;
- random/misaligned footer links;
- visible Echoo branding;
- mono/typewriter CTAs or footer links.

## 9. Typography guardrail

Ordinary UI uses modern sans-serif.

Mono is restricted to technical content. Do not style ordinary controls as a terminal/typewriter interface.

## 10. Responsive guardrail

Every affected major surface must work at:

- ~360px Android portrait;
- 390–430px phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where tested;
- 200% zoom-equivalent cases where tested;
- virtual keyboard open;
- long text/names/URLs.

Do not solve responsiveness by shrinking text into unreadability.

No ordinary horizontal page overflow.

## 11. Offline/error guardrail

Connectivity-banner actions such as `Dismiss` or `Retry` must never collapse into vertical letters.

Blocking error/offline pages should normally use a compact centered content width and one recovery action rather than a giant empty poster panel.

## 12. State integrity

Never show fake:

- listener counts;
- analytics;
- duration;
- health/readiness;
- progress percentages;
- recording/replay availability;
- permissions;
- successful uploads/operations;
- public delivery inferred only from microphone/private contribution.

## 13. Anti-duplication

Do not create a second:

- creator dashboard;
- onboarding app;
- Broadcasts page;
- Studio;
- Backstage/Lobby;
- Recordings workspace;
- auth flow;
- component library;
- client-side lifecycle owner.

Realign current responsible components and APIs.

## 14. No blind bulk rewrites

Do not use broad regex/perl/sed replacements across dozens of frontend files for colours, radii, shadows, typography, spacing or geometry.

Migrate shared tokens/primitives first, then feature surfaces deliberately. Inspect output and tests after each meaningful surface group.

## 15. Test discipline

Do not delete, skip or weaken tests merely to make the redesign pass.

When an old test genuinely conflicts with an intentional new authoritative contract:

1. confirm the contract in current docs;
2. update implementation and test together;
3. explain the intentional contract change;
4. preserve lifecycle, authorization, accessibility and responsive coverage.

## 16. Completion discipline

Do not stop after:

- planning;
- token changes;
- radius/shadow changes;
- two shared components;
- one screen;
- one phase.

Continue until the applicable completion gates in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` are satisfied or a genuine external blocker exists.

A UI V2 report must clearly distinguish implemented/tested work from documented-but-not-implemented work.
