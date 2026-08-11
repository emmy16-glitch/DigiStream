# DigiStream AI Implementation Guardrails

This file is written for Codex, Claude Code, Cline, Copilot-style agents, repository agents, and human implementers. It exists to prevent visual drift, duplicate product flows, fake state, and low-quality template UI.

## 1. Mandatory read-before-edit contract

Before any work involving frontend layout, CSS, design-system primitives, navigation presentation, authentication UI, creator UI, listener UI, Studio, Studio Lobby, Backstage, Recordings, analytics, settings, modals, forms, tables, search, chat, loading states, or responsive behavior, read in this order:

1. root `AGENTS.md`;
2. nearest scoped `AGENTS.md` (especially `apps/web/AGENTS.md` for web work);
3. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`;
4. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
5. this file;
6. the relevant product/lifecycle/quality document referenced by root `AGENTS.md`;
7. `docs/design/REFERENCE_INDEX.md` and the matching 50-screen reference only for content/flow/composition intent;
8. existing implementation and tests.

Do not begin UI implementation from memory after seeing one screenshot or one component demo.

## 2. Authority split

### Product truth controls

- authorization and roles;
- tenant isolation;
- lifecycle transitions;
- organization/channel/broadcast ownership;
- whether a metric exists;
- whether a user may perform an action;
- whether a broadcast is scheduled, starting, live, reconnecting, ending, completed, cancelled, or failed;
- recording/replay availability;
- microphone/private-contribution/public-delivery readiness;
- error and recovery behavior;
- privacy/security boundaries.

### UI Constitution controls

- reusable visual grammar;
- neutral surface system;
- density;
- typography hierarchy;
- border/radius/elevation treatment;
- navigation presentation;
- table/row/card usage;
- shared component expectations;
- responsive and accessibility presentation rules.

### Beautiful UI adaptation standard controls

- which Beautiful UI patterns are appropriate for DigiStream;
- how Sidebar Nav, Search, Task Rows, Filter/Records Tables, Loading State, Approval Card, Chat, Context Cards, Insight Cards and related patterns map to DigiStream responsibilities;
- what must not be copied because it is AI-agent-specific;
- external-reference licensing/copy restrictions.

### 50-screen reference pack controls

The screenshots are now secondary references for:

- screen responsibility;
- journey intent;
- content grouping;
- relative hierarchy;
- examples of which information belongs together.

They are **not** authoritative for the old cream dotted canvas, hard offset shadows, poster-like card geometry, or dusty-pink-heavy application treatment.

## 3. Absolute prohibitions

A change fails agent self-review if it introduces any of the following without explicit written approval:

- fake metrics, fake listener counts, fake analytics, fake health scores or fake percentages;
- fake progress stages used only because Beautiful UI demonstrates task progress;
- duplicate Studio, Broadcasts, Recordings, Studio Lobby, authentication or onboarding implementations;
- generic giant-card dashboards for repeated record data;
- mandatory cream dotted application backgrounds;
- hard black offset shadows as the default surface treatment;
- heavy dusty-pink page washes;
- glassmorphism/frosted panels;
- neon glow;
- decorative gradients across operational UI;
- 20px+ radius on every card/control;
- AI Thinking, model picker, prompt bar or reasoning trace UI without a real DigiStream AI feature;
- destructive actions labeled only `Confirm`, `Continue`, `Yes`, or similarly vague copy;
- hidden primary action caused by decorative content or oversized empty-state art;
- feature-local state machines inside generic design-system components;
- client-only permissions or fake onboarding completion;
- weakening lifecycle/security/accessibility tests to make a visual redesign pass.

## 4. Beautiful UI inspection protocol

External reference: `https://beautiful-ui-five.vercel.app/`

When network access is available and the task uses a Beautiful UI-inspired pattern:

1. open the live reference;
2. identify the specific pattern being adapted;
3. inspect hierarchy, density, border treatment, text hierarchy, action placement and state presentation;
4. map the pattern to an existing DigiStream responsibility;
5. implement it using DigiStream components and domain state;
6. do not copy AI-specific language/data;
7. do not paste external source code/assets unless license terms have been verified.

When network access is unavailable, `BEAUTIFUL_UI_ADAPTATION_STANDARD.md` is the canonical local description. Do not hallucinate missing Beautiful UI details from memory.

## 5. Component-first implementation rule

Before creating a new component:

1. search `apps/web/src/design-system/`;
2. search adjacent feature components;
3. determine whether an existing primitive can be extended safely;
4. preserve its accessibility/state behavior;
5. only add a new primitive when there is a genuinely reusable responsibility.

Expected reusable primitives include equivalents of:

- Button / IconButton;
- Badge / StatusBadge / StatusDot;
- PageHeader / SectionHeader;
- Sidebar / NavItem;
- SearchField / CommandSearch;
- FilterTabs;
- DataTable / responsive record row;
- TaskRow / TaskList;
- LoadingState;
- EmptyState / ErrorState;
- ContextPanel;
- ConfirmationDialog / ApprovalCard;
- InsightCard;
- MessageRow / Composer;
- SelectionBar;
- modal/sheet primitives.

Do not create 50 page-local visual systems for 50 screens.

## 6. Pattern choice rules

Use **rows/tables** when users compare repeated records.

Use **cards** when information forms one meaningful contained decision/context.

Use **task rows** for real staged work/readiness.

Use **loading states** for real asynchronous wait.

Use **approval/confirmation** for consequential actions.

Use **insight cards** only when analytics are trustworthy.

Use **context cards/panels** for secondary selected-resource context.

Use **chips/badges** for compact semantic state, not as decoration.

Use **search/command search** only when results/actions are authorized and real.

## 7. Copy-contract rule

DigiStream has acceptance tests that intentionally protect terminology and product meaning.

Before changing user-visible product copy:

- search tests for the current phrase;
- check product docs for mandated vocabulary;
- determine whether the change is intentional product evolution or accidental redesign drift;
- update tests only when the authoritative contract has actually changed.

Never shorten important product language only to make a layout look cleaner.

Examples of protected semantic distinctions include:

- `Studio Lobby` versus an ambiguous `Lobby`;
- Studio/private contribution versus public delivery;
- scheduled versus live;
- completed broadcast versus recording/replay ready.

## 8. Responsive protocol

Every changed UI pattern must define behavior for applicable viewports before the implementation is considered complete:

- small Android portrait;
- large phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where CI covers it;
- 200% zoom where acceptance tests cover it.

Rules:

- no ordinary horizontal page overflow;
- do not solve narrow layouts by shrinking text into unreadability;
- desktop tables transform into compact mobile record rows when needed;
- sticky/fixed controls must reserve content clearance;
- virtual keyboard must not hide active forms/chat composer/critical primary action;
- browser/Android Back closes the top transient layer first;
- focus is restored on close;
- account/sign-out remain discoverable.

## 9. Accessibility protocol

For every added/changed component verify:

- semantic element choice;
- accessible name;
- keyboard operation;
- obvious focus-visible state;
- touch target size;
- contrast;
- status meaning without color;
- correct heading relationships;
- dialog/sheet focus trapping and restoration;
- reduced-motion behavior;
- screen-reader announcement for meaningful async state changes without excessive chatter.

## 10. State completeness protocol

Do not implement only the screenshot happy path.

For affected surfaces cover relevant states:

- loading;
- empty;
- unauthorized/private-not-found;
- offline/network failure;
- stale session;
- validation error;
- request failure;
- retry/recovery;
- long content;
- disabled permission state;
- lifecycle transitions;
- mobile keyboard open/closed;
- reconnecting/return from background where operationally relevant.

## 11. Broadcast truth guardrails

Agents must preserve these distinctions:

- microphone detected != microphone signal healthy;
- microphone healthy != private Studio connected;
- private Studio connected != public delivery ready;
- public delivery ready != broadcast live unless lifecycle confirms it;
- scheduled != starting;
- starting != live;
- reconnecting != healthy live;
- completed != recording ready;
- recording ready != replay published;
- replay published != public if visibility is private/unlisted.

Do not collapse states merely to simplify a component.

## 12. Loading/progress guardrails

- percentage requires measurable progress;
- elapsed time should help a user understand a wait, not create false precision;
- scheduled waiting content must not show fake active progress;
- success waits for real response/media evidence;
- loading controls preserve width/layout;
- retries are bounded and state-aware;
- an animation must not become a second state machine.

## 13. Destructive-action guardrails

For actions such as End broadcast, Delete recording, Suspend user, Remove participant or Revoke session:

- state the exact action in the title/button;
- explain the real consequence;
- provide a safe cancel/return action;
- preserve server authorization;
- prevent accidental double submission;
- handle stale/conflicting state safely.

## 14. Analytics guardrails

Do not show Analytics because a reference looks attractive.

Every displayed metric needs:

- trustworthy source;
- authorized scope;
- time range;
- unit;
- unavailable/partial-data handling;
- consistent comparison basis.

If the system does not have trustworthy data, keep the metric/surface hidden or explicitly unavailable according to product documents.

## 15. External-source licensing guardrail

Beautiful UI is a design reference.

Agents may reimplement publicly visible interaction ideas. Do not paste substantial external implementation code, proprietary icons, images, illustrations or other assets unless the applicable license is verified and repository notices are updated if required.

When uncertain, reimplement from first principles using DigiStream's own React/CSS/design-system architecture.

## 16. Test discipline

Before claiming a UI change complete:

- typecheck;
- run affected unit/API tests;
- run production build;
- run relevant Playwright suites;
- run the responsive matrix applicable to the change;
- inspect the first real failure instead of rerunning blindly;
- preserve product/copy/accessibility tests unless the authority actually changed;
- update obsolete purely visual assertions only when the new Constitution explicitly supersedes them.

A redesign is not a justification for deleting meaningful acceptance coverage.

## 17. Agent completion report

When finishing UI work, report:

- existing surfaces reused;
- Beautiful UI pattern(s) adapted;
- shared primitives created/changed;
- product contracts intentionally changed, if any;
- tests run and results;
- responsive evidence;
- accessibility checks;
- remaining limitations or blocked states;
- any external asset/code licensing decision.

Do not describe unfinished or untested visual work as complete.
