# DigiStream AI Implementation Guardrails

This file is written for Codex, Claude Code, Cline, Copilot-style agents, repository agents, and human implementers. It exists to prevent visual drift, duplicate flows, fake state, and low-quality template UI.

## 1. Mandatory read-before-edit contract

Before any work involving frontend layout, CSS, design-system primitives, navigation presentation, authentication UI, creator UI, listener UI, Studio, Studio Lobby, Backstage, Recordings, analytics, settings, modals, forms, tables, search, chat, loading states, colours, or responsive behavior, read in this order:

1. root `AGENTS.md`;
2. nearest scoped `AGENTS.md` (especially `apps/web/AGENTS.md`);
3. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`;
4. `docs/design/BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
5. this file;
6. relevant product/lifecycle/quality documents referenced by root `AGENTS.md`;
7. `docs/design/REFERENCE_INDEX.md` and matching 50-screen reference for product composition/journey intent;
8. existing implementation and tests.

Do not begin implementation from memory after seeing one screenshot or one component demo.

---

## 2. The one-sentence visual rule every agent must remember

> **Keep DigiStream's warm cream dotted canvas, use white/neutral inner operational surfaces, keep dusty pink as the main brand accent, borrow Beautiful UI's compact component hierarchy and restrained mixed accent colours, and keep all lifecycle semantics truthful and consistent.**

If your change removes the cream dotted identity entirely, it is wrong unless a specific surface intentionally requires a solid operational canvas.

If your change makes every component cream/pink with heavy shadow, it is also wrong.

---

## 3. Authority split

### Product truth controls

- authorization and roles;
- tenant isolation;
- organization/channel/broadcast ownership;
- lifecycle transitions;
- whether a metric exists;
- whether an action is allowed;
- recording/replay availability;
- microphone/device state;
- private contribution state;
- public delivery state;
- error/recovery behavior;
- privacy/security boundaries.

### UI Constitution controls

- cream dotted shell identity;
- reusable surface hierarchy;
- brand/supporting/semantic colour roles;
- density;
- typography;
- borders/radius/elevation;
- navigation presentation;
- rows/tables/card usage;
- shared component expectations;
- responsive/accessibility presentation.

### Beautiful UI adaptation standard controls

- which Beautiful UI patterns map to DigiStream;
- how Sidebar Nav, Search, Task Rows, Filter/Records Tables, Loading State, Approval Card, Chat, Context Cards, Insight Cards, Recommendation Cards, Tool Chips and Selection Actions are adapted;
- how restrained mixed colours are layered over the cream DigiStream identity;
- which AI-specific patterns must not be copied;
- external-source licensing/copy restrictions.

### 50-screen reference pack controls

Use the screenshots for:

- screen responsibility;
- journey intent;
- information grouping;
- relative hierarchy;
- examples of what belongs together;
- brand continuity where compatible with the Constitution.

Do not copy illustrative data or obsolete oversized-card composition blindly.

---

## 4. Absolute prohibitions

A change fails agent self-review if it introduces any of the following without explicit written approval:

- fake metrics, listener counts, analytics, health scores or percentages;
- fake progress stages;
- duplicate Studio, Broadcasts, Recordings, Studio Lobby, authentication or onboarding implementations;
- removing the cream dotted application identity from ordinary shells just to look more generic;
- replacing the whole UI with gray/white generic SaaS chrome;
- making every component cream/pink with no surface contrast;
- random rainbow accent colours with no mapping;
- decorative accent colours used as lifecycle semantics;
- hard black offset shadows on every operational component;
- giant card grids for repeated record data;
- glassmorphism/frosted panels;
- neon glow;
- gradient-heavy operational UI;
- 20px+ radius on every card/control;
- AI Thinking/model-picker/prompt/reasoning UI without a real DigiStream AI feature;
- destructive actions labeled only `Confirm`, `Continue`, `Yes`, or similarly vague copy;
- giant empty-state illustrations that hide the next action;
- feature-local business state inside generic design-system components;
- client-only permissions or fake onboarding completion;
- weakening lifecycle/security/accessibility tests just to make a redesign pass.

---

## 5. Beautiful UI inspection protocol

External reference: `https://beautiful-ui-five.vercel.app/`

When network access is available and a task uses a Beautiful UI-inspired pattern:

1. open the live reference;
2. identify the exact pattern being adapted;
3. inspect hierarchy, density, border treatment, action placement, colour rhythm and state presentation;
4. map it to an existing DigiStream responsibility;
5. preserve the cream dotted outer identity;
6. decide which inner surfaces become white/neutral/pale accent;
7. decide which supporting accent family, if any, is justified;
8. implement using DigiStream components and domain state;
9. do not copy AI-specific language/data;
10. do not paste external source/assets unless license terms are verified.

When network access is unavailable, `BEAUTIFUL_UI_ADAPTATION_STANDARD.md` is the canonical local description. Do not hallucinate the external reference from memory.

---

## 6. Colour implementation guardrails

Before adding or changing colour, identify its role:

- **canvas** — cream dotted background;
- **surface** — white/warm-white/neutral;
- **brand** — dusty pink;
- **supporting accent** — lavender/sky/mint/amber/peach;
- **semantic** — live/success/warning/danger/info.

Rules:

- every new colour must map to one of these roles;
- supporting accent does not equal status;
- normally use no more than 1–2 supporting accent families in the same visible region;
- dusty pink remains the main brand anchor;
- mint cannot silently mean success;
- amber cannot silently mean warning unless the semantic warning treatment is intentionally used;
- sky cannot become a global brand-blue replacement;
- lavender cannot become a second primary brand colour;
- use pale tints more than saturated fills;
- all text contrast must remain accessible.

---

## 7. Component-first implementation rule

Before creating a new component:

1. search `apps/web/src/design-system/`;
2. search adjacent feature components;
3. determine whether an existing primitive can be extended;
4. preserve accessibility and state behavior;
5. add a new primitive only for a genuinely reusable responsibility.

Expected reusable equivalents include:

- Button / IconButton;
- Badge / StatusBadge / StatusDot;
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
- Toolbar;
- Modal/Sheet primitives.

Do not create 50 isolated visual systems for 50 screens.

---

## 8. Pattern-choice rules

Use **rows/tables** when users compare repeated records.

Use **cards** for one meaningful contained context or decision.

Use **task rows** for real staged work/readiness.

Use **loading state** for genuine asynchronous waiting.

Use **approval/confirmation** for consequential actions.

Use **insight cards** only for trustworthy analytics.

Use **context panels/cards** for supporting resource context.

Use **chips/badges** for compact semantic/categorical information.

Use **search/command search** only when results/actions are authorized and real.

---

## 9. Copy-contract rule

DigiStream has tests that protect terminology and product meaning.

Before changing user-visible copy:

- search tests for the current phrase;
- check product docs for mandated vocabulary;
- determine whether a change is intentional product evolution or accidental visual drift;
- update tests only when the authoritative contract actually changed.

Never shorten important product language merely to fit a cleaner layout.

Protected distinctions include:

- `Studio Lobby` versus ambiguous `Lobby`;
- Studio/private contribution versus public delivery;
- scheduled versus live;
- completed broadcast versus recording/replay ready.

---

## 10. Responsive protocol

Every changed pattern must define applicable behavior for:

- small Android portrait;
- large phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site simulation where CI covers it;
- 200% zoom where acceptance tests cover it.

Rules:

- no ordinary horizontal overflow;
- do not solve narrow layouts by shrinking text into unreadability;
- desktop tables transform into compact mobile record rows where needed;
- sidebar becomes the validated mobile navigation pattern;
- fixed/sticky controls reserve content clearance;
- virtual keyboard must not hide active forms/chat composer/critical action;
- browser/Android Back closes the top transient layer first;
- focus restores on close;
- account/sign-out remain discoverable;
- cream/dot treatment may become subtler on small screens but should remain recognizable.

---

## 11. Accessibility protocol

For every added/changed component verify:

- semantic element choice;
- accessible name;
- keyboard operation;
- visible focus;
- touch target size;
- contrast;
- status meaning without colour;
- correct heading relationships;
- dialog/sheet focus trap and restoration;
- reduced-motion behavior;
- careful announcement of meaningful async state.

Supporting accent colours are decoration/grouping unless accompanied by semantic text/structure.

---

## 12. State completeness protocol

Do not implement only the happy path.

Cover relevant states:

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
- reconnecting/background return where operationally relevant.

---

## 13. Broadcast truth guardrails

Preserve these distinctions:

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

Do not collapse states to simplify a component.

---

## 14. Loading/progress guardrails

- percentage requires measurable progress;
- elapsed time should help the user understand a real wait;
- scheduled waiting content must not show fake active progress;
- success waits for real response/media evidence;
- loading controls preserve width/layout;
- retries are bounded and state-aware;
- animation cannot become a second state machine.

---

## 15. Destructive-action guardrails

For actions such as End broadcast, Delete recording, Suspend user, Remove participant or Revoke session:

- state the exact action in title/button;
- explain the real consequence;
- provide a safe cancel/return action;
- preserve server authorization;
- prevent accidental double submission;
- handle stale/conflicting state safely.

---

## 16. Analytics guardrails

Do not show Analytics because a reference looks attractive.

Every metric needs:

- trustworthy source;
- authorized scope;
- time range;
- unit;
- unavailable/partial-data handling;
- consistent comparison basis.

Mixed supporting colours are allowed only after the metric is real. Decorative colour does not justify a metric's existence.

---

## 17. External-source licensing guardrail

Beautiful UI is a design reference.

Agents may reimplement publicly visible interaction/visual ideas. Do not paste substantial external implementation code, proprietary icons, images, illustrations or other assets unless the license is verified and repository notices are updated if required.

When uncertain, reimplement from first principles using DigiStream's own React/CSS/design-system architecture.

---

## 18. Test discipline

Before claiming a UI change complete:

- typecheck;
- run affected unit/API tests;
- run production build;
- run relevant Playwright suites;
- run the responsive matrix applicable to the change;
- inspect the first real failure instead of rerunning blindly;
- preserve product/copy/accessibility tests unless authority truly changed;
- update obsolete purely visual assertions only when the Constitution intentionally changed them.

A redesign is not permission to delete meaningful acceptance coverage.

---

## 19. Agent completion report

When finishing UI work, report:

- existing surfaces reused;
- Beautiful UI pattern(s) adapted;
- cream/dotted shell treatment;
- supporting accent colours used and why;
- shared primitives created/changed;
- product contracts intentionally changed, if any;
- tests run/results;
- responsive evidence;
- accessibility checks;
- remaining limitations;
- external asset/code licensing decision if applicable.

Do not describe unfinished or untested visual work as complete.
