# GitHub Copilot instructions for DigiStream

Follow root `AGENTS.md` as the primary repository instruction file, then `.agents/README.md`.

For every frontend/UI/UX/design-system change, also read:

1. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`
2. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
3. `docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
4. `docs/design/DESIGN_TOKENS.md`
5. `docs/design/REFERENCE_INDEX.md`
6. `apps/web/AGENTS.md`

External UI reference: `https://beautiful-ui-five.vercel.app/`

Mandatory visual rule: **preserve DigiStream's warm cream dotted application canvas; use white/neutral inner operational surfaces; keep dusty pink as the primary brand accent; use restrained supporting lavender/sky/mint/amber/peach tints; adapt Beautiful UI's compact navigation, tables/rows, search, task, loading, approval, chat, context and insight patterns without copying its AI-specific product identity.**

Do not remove the cream dotted identity to create generic SaaS UI. Do not make every component a large cream/pink card with heavy shadow either.

Never use design guidance to invent routes, APIs, permissions, metrics, lifecycle state, recordings, readiness or success. Reuse the current responsible component and preserve DigiStream architecture, accessibility and responsive requirements.

Before changing product copy, check tests/docs for protected language. Do not weaken meaningful product/accessibility/lifecycle tests merely to make a redesign pass.
