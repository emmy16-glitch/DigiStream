# DigiStream web UI agent instructions

These instructions apply to all files under `apps/web/` and supplement root `AGENTS.md`.

## Mandatory authority order

For every frontend/UI/design-system change, read and follow in this order:

1. `../../docs/design/DIGISTREAM_UI_V2_COMPLETE_SPEC.md`
2. `../../docs/design/DIGISTREAM_UI_CONSTITUTION.md`
3. `../../docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
4. `../../docs/design/DESIGN_TOKENS.md`
5. `../../docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
6. `../../docs/design/REFERENCE_INDEX.md`
7. the relevant numbered reference screen(s) for composition/journey intent
8. root `AGENTS.md` and its product-truth/lifecycle/reliability documents
9. current implementation and tests

The 50-screen pack is **not** sole reusable visual authority. It informs screen responsibility, content grouping, relative hierarchy and journey intent. Reusable presentation is controlled by the current UI V2 specification and Constitution.

## Non-negotiable hybrid visual rule

The current product is:

- warm cream dotted outer application canvas;
- white/warm-white/neutral inner operational surfaces;
- dusty pink as the principal brand accent;
- restrained lavender/sky/mint/amber/peach supporting tints;
- fixed semantic live/success/warning/danger/info treatments;
- compact Beautiful UI-quality navigation, rows, tables, task states, loading, approval, chat, context and insight patterns;
- restrained 6–10px operational radius;
- borders/dividers before shadow;
- rare hard-offset brand shadow only when deliberately appropriate.

Do **not** implement any stale instruction requiring:

- dark/emerald default UI;
- square cards/controls everywhere;
- hard black offset shadows everywhere;
- typewriter/mono labels and buttons;
- giant repeated cream/pink cards;
- generic gray/blue SaaS.

Those rules are obsolete.

## Branding

User-visible branding is **DigiStream**.

Do not leave visible `Echoo` branding in headers, auth, landing, footer, system states or normal product copy. Internal legacy CSS/file/class names may remain temporarily if renaming them would create unrelated risk, but they must not leak into visible UI.

Before declaring migration complete, search user-visible strings/tests for stale `Echoo` references and classify/fix them.

## Typography

Normal UI uses the modern sans-serif contract in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.

Preferred primary family: `Manrope` with normal system fallbacks.

Mono is technical-only. Do not use monospace by default for:

- buttons;
- nav labels;
- forms;
- marketing copy;
- card titles;
- ordinary paragraphs;
- error/empty-state prose;
- footer links.

## Beautiful UI component mapping

Where the real product responsibility fits, adapt:

- Sidebar Nav -> creator navigation;
- Search -> authorized command/resource search;
- Task Rows -> Studio readiness/recovery, onboarding work, recent records;
- Filter Table -> Broadcasts/Recordings;
- Records Table -> team/users/channels/sessions/admin records;
- Loading State -> connection/device/delivery/recording waits;
- Approval Card -> end/delete/suspend/remove/revoke consequential actions;
- Chat -> Studio Lobby/live human communication;
- Context Cards -> selected channel/broadcast/guest/recording context;
- Insight Cards -> trustworthy analytics only;
- Selection Actions -> real supported bulk actions only.

Do not add AI Thinking/model/prompt/reasoning UI unless DigiStream gains an explicit real AI product feature.

## Shared component completion rule

Search `src/design-system/` before creating a primitive.

The V2 migration is not complete until shared ownership exists for applicable equivalents of:

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
- Empty/Error/Offline/Unauthorized states;
- ApprovalCard / confirmation dialog/sheet;
- ContextCard;
- InsightCard;
- MessageRow / Composer;
- SelectionBar where real;
- Modal/Sheet focus/Back/scroll-lock primitives.

Changing tokens plus two components is not completion.

## Landing page requirements

The public landing page has an explicit contract in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.

Do not ship:

- a mobile hero so large it consumes nearly the full first viewport;
- four enormous stacked feature cards;
- tall empty numbered poster cards for a simple three-step journey;
- an ungrouped/misaligned footer;
- stale Echoo branding;
- monospace buttons/footer links.

Use a controlled hero, compact capabilities, compact three-step flow, meaningful supporting content, one final CTA and a properly grouped responsive footer.

## System/offline/error states

Connectivity banners and blocking state pages must remain responsive.

A banner action such as `Dismiss`, `Retry`, etc. must never collapse into a vertical column of individual letters. Use flex/min-width rules and mobile stacking deliberately.

Blocking states should normally use a compact centered content width rather than a giant mostly-empty poster panel.

## Existing surfaces first

Reuse/realign current routes, APIs and feature owners. Do not create duplicate dashboards, Studio implementations, Broadcasts pages, Recordings pages, Lobby/Backstage flows, auth flows or business logic merely to achieve visual fidelity.

Generic design-system components own presentation, not lifecycle/authorization/media truth.

## Product truth

Never fabricate:

- listener counts;
- analytics;
- readiness;
- lifecycle state;
- progress percentages;
- recording/replay availability;
- permissions;
- success.

Scheduled is not live. Private contribution is not public delivery. Completed broadcast is not automatically recording-ready.

## Anti-bulk-rewrite rule

Do not use broad `perl`, `sed`, regex or mechanical global replacements across dozens of frontend files for colours, radius, shadows, spacing, typography or component geometry.

Migrate shared tokens/primitives first, then feature surfaces deliberately. Inspect every affected screen and test.

## Copy contract

Before changing user-visible product language, search tests and product docs.

Preserve meaningful product distinctions such as `Studio Lobby`, scheduled/live/completed, private Studio/public delivery, and recording readiness. Do not protect obsolete Echoo branding merely because a stale test contains it.

## Responsive acceptance

Every relevant change must work for:

- ~360px Android portrait;
- 390–430px phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where tested;
- 200% zoom-equivalent cases where tested;
- virtual keyboard open;
- long text/names/URLs;
- browser/Android Back and Escape.

No ordinary horizontal overflow.

## Completion / PR expectation

A UI migration is incomplete while any major V2 surface/component family remains intentionally old or while required CI fails.

Every UI PR/report should identify:

- surfaces changed;
- Beautiful UI pattern(s) adapted;
- shared primitives changed/created;
- DigiStream cream/dotted treatment;
- supporting accent use;
- stale branding removed;
- typography treatment;
- landing/footer changes if relevant;
- responsive/accessibility evidence;
- tests run/results;
- remaining blockers.
