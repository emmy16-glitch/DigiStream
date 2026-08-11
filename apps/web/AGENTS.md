# DigiStream web UI agent instructions

These instructions apply to all files under `apps/web/` and supplement root `AGENTS.md`.

## Mandatory design authority

For every frontend/UI/design-system change, read and follow in this order:

1. `../../docs/design/DIGISTREAM_UI_CONSTITUTION.md`
2. `../../docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`
3. `../../docs/design/DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`
4. `../../docs/design/DESIGN_TOKENS.md`
5. `../../docs/design/REFERENCE_INDEX.md`
6. the relevant numbered screen reference(s) under `../../docs/design/reference/screens/` for product composition/journey intent
7. root `AGENTS.md` and its product-truth/lifecycle/quality documents

External Beautiful UI reference:

`https://beautiful-ui-five.vercel.app/`

Open the live reference when network access is available and the task adapts one of its patterns. If it is unavailable, use the local adaptation standard rather than guessing.

## The mandatory hybrid visual rule

**Do not remove the cream dotted DigiStream identity.**

The correct implementation is:

- warm cream dotted outer application canvas;
- white/warm-white/neutral inner operational surfaces;
- dusty pink as the main DigiStream brand accent;
- restrained lavender/sky/mint/amber/peach supporting tints where useful;
- fixed semantic live/success/warning/danger/info treatments;
- compact Beautiful UI-like navigation, rows, tables, search, task states, approval patterns, chat and insight cards;
- minimal shadow inside dense operational screens;
- optional rare hard-offset brand shadow only where intentionally appropriate.

Do not turn the product into generic gray SaaS.

Do not turn every component into a cream/pink poster card either.

## Beautiful UI component mapping

Where the responsibility fits, adapt:

- `Sidebar Nav` -> creator workspace navigation;
- `Search` -> authorized command/resource search;
- `Task Rows` -> Studio readiness, onboarding progression, recording/recovery stages;
- `Filter Table` -> Broadcasts and Recordings;
- `Records Table` -> users/team/invitations/channels/sessions/admin records;
- `Loading State` -> Studio/device/delivery/recording/session waits;
- `Approval Card` -> End broadcast, delete, suspend, remove/revoke and other consequential actions;
- `Chat` -> Studio Lobby/live human communication without AI reasoning traces;
- `Context Cards` -> selected channel/broadcast/guest/recording context;
- `Insight Cards` -> trustworthy analytics only;
- `Recommendation Card` -> evidence-backed operational guidance only;
- `Tool Chips` -> secondary diagnostics/status details;
- `Selection Actions` -> only real supported bulk operations.

Do not introduce Beautiful UI's AI Thinking, model picker, prompt bar, reasoning trace, code-generation or fine-tune UI unless DigiStream gains an explicit real AI feature.

## Existing surfaces first

Do not create duplicate product flows to match a visual reference.

Reuse/realign the existing responsible surface and existing API/domain logic.

Search `src/design-system/` before creating a new primitive.

Strong shared candidates include equivalents of:

- Button / IconButton;
- Badge / StatusDot;
- PageHeader / SectionHeader;
- Sidebar / NavItem;
- SearchField / CommandSearch;
- FilterTabs;
- DataTable / ResponsiveRecordRow;
- TaskRow / TaskList;
- LoadingState;
- EmptyState / ErrorState;
- ContextPanel;
- ConfirmationDialog / ApprovalCard;
- InsightCard;
- MessageRow / Composer;
- SelectionBar;
- Modal/Sheet primitives.

Generic design-system components must not become authorization/lifecycle/media state owners.

## Product truth remains mandatory

The visual system does not supersede:

- backend authorization;
- tenant isolation;
- lifecycle state;
- media readiness;
- microphone/private contribution/public delivery separation;
- recording/replay truth;
- privacy/security;
- accessibility;
- root `AGENTS.md` anti-duplication and reliability requirements.

Never fabricate data to make a reference look complete.

## Copy-contract rule

Before changing user-visible product language, search tests and product docs.

Do not casually shorten protected language for layout cleanliness. In particular preserve distinctions such as:

- `Studio Lobby` vs ambiguous `Lobby`;
- private Studio contribution vs public delivery;
- scheduled vs live;
- completed broadcast vs recording/replay ready.

Update a test only when the authoritative contract actually changed.

## Colour guardrail

Every colour must have a role:

- cream dotted canvas;
- white/neutral surface;
- dusty-pink brand;
- supporting lavender/sky/mint/amber/peach accent;
- semantic live/success/warning/danger/info.

Normally use no more than 1–2 supporting accent families in the same visible region.

Supporting accent does not equal lifecycle state.

## Responsive rule

Every UI change must define applicable behavior for:

- small Android portrait;
- large phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where CI requires it;
- 200% zoom where existing tests cover it.

Desktop tables should transform into compact mobile record rows when necessary. Do not use a squeezed desktop sidebar on mobile.

Preserve safe areas, virtual-keyboard clearance, focus, Back/Escape and no ordinary horizontal overflow.

## PR expectation

Any UI PR should identify:

- surface(s) changed;
- Beautiful UI pattern(s) adapted;
- relevant 50-screen reference numbers used for composition/journey intent;
- shared primitives changed/created;
- cream/dotted shell treatment;
- supporting accent colours used and why;
- deliberate deviations;
- responsive/accessibility evidence;
- tests run/results.

A UI redesign is not complete while relevant CI is failing.
