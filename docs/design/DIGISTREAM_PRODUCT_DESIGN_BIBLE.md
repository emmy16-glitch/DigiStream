# DigiStream Product Design Bible — LEGACY / SUPERSEDED

Status: **historical product-design reference only — NOT a current visual authority**

> IMPORTANT FOR CODEX, CLINE, CLAUDE, COPILOT, MONKEYCODE AND HUMAN CONTRIBUTORS
>
> Do **not** use the old dark/emerald theme, near-black application canvas, emerald primary actions, legacy rounded-card guidance, legacy glow guidance, or any other historical visual rules from previous revisions of this file.
>
> Those visual rules are superseded.

## Current visual authority

For every frontend/UI/UX/design-system task, use this order:

1. `../../AGENTS.md` for product, lifecycle, reliability, authorization, architecture and repository-wide rules;
2. `DIGISTREAM_UI_CONSTITUTION.md` for the current reusable visual system;
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md` for how Beautiful UI patterns are adapted to DigiStream;
4. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md` for implementation-agent behavior;
5. `DESIGN_TOKENS.md` for semantic colours, radius, spacing and elevation;
6. `REFERENCE_INDEX.md` and the relevant numbered reference screen for product composition, screen responsibility and journey intent;
7. feature-specific product/lifecycle documents and the existing implementation/tests.

External design reference:

`https://beautiful-ui-five.vercel.app/`

## Current DigiStream visual rule

The production direction is:

> **warm cream dotted DigiStream application canvas + clean white/warm-white/neutral operational surfaces + dusty-pink principal brand accent + restrained lavender/sky/mint/amber/peach supporting tints + Beautiful UI-quality compact component grammar + truthful semantic lifecycle colours.**

This means:

- keep the warm cream dotted outer application canvas;
- keep enough cream/dotted shell visible that the product remains recognizably DigiStream;
- use white, warm-white and subtle neutral surfaces for dense operational workspaces;
- keep dusty pink as the principal brand accent;
- use lavender, sky, mint, amber and peach only as restrained supporting accents/grouping tints;
- do not use supporting accents as invented lifecycle state;
- use rows/tables for repeated comparable records instead of giant repeated cards;
- use restrained 6–10px radius for ordinary controls/panels rather than square-everywhere or huge SaaS rounding;
- use borders/dividers for most structure;
- use subtle elevation when needed;
- reserve hard black offset shadows for rare deliberate brand/hero accents only;
- preserve one contextual primary action per state;
- preserve real API/lifecycle/media readiness and authorization truth;
- preserve accessibility, responsive Android behavior, keyboard/focus/Back handling and reduced motion.

## Beautiful UI patterns approved for adaptation

Adapt where they match a real DigiStream responsibility:

- Sidebar Nav -> creator navigation/workspace shell;
- Search / Command Search -> authorized navigation/resource search;
- Task Rows -> onboarding, readiness, lifecycle recovery and recording processing;
- Filter Table -> Broadcasts and Recordings;
- Records Table -> settings/admin/team/channel/session management;
- Loading State -> genuine asynchronous waits;
- Approval Card -> Go Live/End Broadcast/delete/suspend/revoke confirmations;
- Chat -> Studio Lobby/live audience/guest communication;
- Context Cards -> selected organisation/channel/broadcast/recording context;
- Insight Cards -> trustworthy analytics only;
- Tool Chips -> secondary diagnostics/status context;
- Selection Actions -> real supported bulk operations only.

Do not introduce Beautiful UI's AI-specific Thinking traces, model selectors, prompt bars, agent reasoning or tool-call timelines unless DigiStream gains an explicitly specified AI feature.

## Product identity retained from historical design work

The following product-intent principles remain useful and compatible with the current system:

- DigiStream is audio-first live broadcasting software for creators, churches, organisations and communities;
- the product should feel professional without becoming cold or generic;
- technical state should be trustworthy without overwhelming non-technical users;
- live operation should become calmer, not more decorative;
- phones are a first-class target, not a reduced desktop port;
- contribution state, public delivery state and listener-facing state must remain distinct;
- product screens use real backend state and never fabricate metrics, listener counts, health, recordings, progress or permissions.

All detailed product flows, lifecycle rules, onboarding behavior, Studio behavior, Recordings behavior, replay behavior, security and authorization must come from the current product documents referenced by root `AGENTS.md` rather than historical visual prose in this file.

## Why this file remains in the repository

Older commits, PRs and documents may link to `DIGISTREAM_PRODUCT_DESIGN_BIBLE.md`. Deleting the path would create broken historical references. Therefore the file remains as a compatibility/deprecation document that redirects contributors to the current authority chain.

If an implementation agent discovers older content through git history, screenshots, cached context, comments or previous branches, it must not resurrect that visual system.

## Conflict rule

If any old instruction says one of the following:

- dark/near-black application canvas as the default;
- emerald/green as the product-wide primary action colour;
- square controls everywhere;
- hard black offset shadows everywhere;
- cream/pink cards everywhere;
- giant repeated cards instead of tables/rows;
- exact literal recreation of the 50 reference screenshots;

that instruction is **obsolete**.

Use `DIGISTREAM_UI_CONSTITUTION.md` + `BEAUTIFUL_UI_ADAPTATION_STANDARD.md` instead.

Product truth, lifecycle, authorization, media readiness, privacy, accessibility and reliability remain more authoritative than any visual reference.