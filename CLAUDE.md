# Claude instructions for DigiStream

Read root `AGENTS.md` first; it remains authoritative for product truth, lifecycle behavior, reliability, security, authorization, anti-duplication rules, and programme sequencing. Then read `.agents/README.md`.

## Mandatory UI/design authority

Before any work involving frontend UI, UX, styling, responsive behavior, navigation presentation, component design, authentication screens, creator surfaces, listener surfaces, Studio, Studio Lobby, Backstage, Recordings, analytics, settings, modals, tables, search, chat, loading/progress or visual polish, also read:

1. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`
2. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
3. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
4. `docs/design/DESIGN_TOKENS.md`
5. `docs/design/REFERENCE_INDEX.md`
6. the relevant approved reference image(s) under `docs/design/reference/screens/` for product composition/journey intent
7. `apps/web/AGENTS.md`

External Beautiful UI reference:

`https://beautiful-ui-five.vercel.app/`

When network access is available, inspect the live Beautiful UI pattern being adapted. When unavailable, use `BEAUTIFUL_UI_ADAPTATION_STANDARD.md` rather than guessing.

## Mandatory hybrid rule

The UI must preserve **DigiStream's warm cream dotted application canvas**.

Inside that identity:

- use white/warm-white/neutral operational surfaces;
- keep dusty pink as the principal brand accent;
- use restrained lavender/sky/mint/amber/peach supporting tints where useful;
- keep live/success/warning/danger/info colours semantic and truthful;
- adapt Beautiful UI's compact Sidebar Nav, Search, Task Rows, Filter/Records Tables, Loading State, Approval Card, Chat, Context Cards, Insight Cards and related patterns where they fit real DigiStream responsibilities;
- reduce unnecessary giant cards and nested hard shadows;
- preserve accessibility and responsive acceptance.

Do not replace the cream dotted shell with generic SaaS gray/white.

Do not make every inner component cream/pink with huge hard shadows either.

## Reference pack interpretation

The 50-screen pack remains important for:

- screen responsibility;
- journey intent;
- information grouping;
- relative hierarchy;
- examples of what belongs together.

It is not permission to fabricate data or reproduce obsolete oversized-card styling where the current Constitution and Beautiful UI adaptation standard intentionally improve density, surfaces, tables, radius, shadow use or navigation.

## Product truth remains mandatory

Nothing in the design system overrides backend authorization, truthful lifecycle/media state, tenant isolation, privacy, accessibility, real API state or existing product responsibilities.

Do not create a duplicate page, second Studio, second Broadcasts flow, second Recordings flow, second Studio Lobby, browser-only resource or fake metric to achieve visual fidelity.

## Agent skills

For design, UI, UX, animation, navigation or visual-polish work, use the relevant repo-level adapter in `.agents/skills/` where useful. Exact upstream revisions are pinned in `.agents/sources.lock.json`; run `npm run skills:sync` only when the full upstream playbook/supporting files are needed.

Design skills are advisory. They do not override the UI Constitution, Beautiful UI adaptation standard, current code responsibilities, authorization, tenant isolation, truthful lifecycle/media state, accessibility requirements or DigiStream architecture.

## Copy and tests

Before changing user-visible copy, search acceptance tests and product documentation. Do not shorten meaningful product language merely to make a layout cleaner.

In particular, preserve distinctions such as `Studio Lobby`, private Studio contribution versus public delivery, scheduled versus live, and completed broadcast versus recording/replay ready.

A redesign is not permission to delete meaningful product, accessibility or lifecycle tests.
