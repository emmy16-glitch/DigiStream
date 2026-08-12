# DigiStream UI V2 Complete Specification

Status: **authoritative frontend presentation and implementation contract**

This document closes the gaps left by earlier design notes. It defines the final reusable DigiStream UI system for all public, listener, creator, guest, Studio, recording, analytics, account, admin, authentication, onboarding, loading, error and responsive surfaces.

It must be read together with product-truth documents referenced by root `AGENTS.md`. Product truth, authorization, tenant isolation, lifecycle, media readiness, privacy, reliability and accessibility always override presentation.

For reusable presentation, this document is the highest-level complete specification. `DIGISTREAM_UI_CONSTITUTION.md`, `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`, `DESIGN_TOKENS.md`, `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`, feature docs and numbered screenshots must agree with it.

---

## 1. Final visual direction

DigiStream is not a clone of Beautiful UI and not a literal recreation of the old 50-screen pack.

The final system is:

> **warm cream dotted DigiStream canvas + clean white/warm-white operational surfaces + dusty-pink brand anchor + restrained supporting colour tints + compact Beautiful UI-quality component grammar + modern readable typography.**

### Keep

- warm cream/off-white application canvas;
- subtle dotted field as a DigiStream signature;
- dusty pink as the principal brand accent;
- near-black primary text;
- strong but controlled visual personality;
- real broadcast-specific lifecycle language;
- responsive/mobile-first behavior;
- truthful product state.

### Borrow from Beautiful UI

- compact navigation rows;
- clean sidebar grouping;
- task/readiness rows;
- filterable records tables;
- contextual search/command access;
- restrained status badges;
- compact loading states;
- approval/confirmation patterns;
- compact human chat hierarchy;
- context panels;
- decision-useful insight cards;
- selection actions;
- subtle borders and calm elevation;
- fewer wrapper cards;
- stronger alignment and density.

### Never do

- generic gray/blue SaaS;
- dark/emerald application theme;
- all-pink application surfaces;
- giant card for every item;
- hard black shadow on every panel;
- square-everything controls;
- 20–28px radius everywhere;
- glossy gradients/glassmorphism/neon effects;
- AI-agent Thinking/reasoning/prompt UI in ordinary DigiStream product screens;
- fake metrics, fake readiness, fake progress or fake listener data.

---

## 2. Product branding contract

The user-facing product name is **DigiStream**.

### Mandatory

- headers, lockups, footers, auth screens, system states, onboarding, creator surfaces and public/listener surfaces must display `DigiStream` where product branding is shown;
- no user-visible `Echoo` brand text may remain unless a specifically documented legacy migration screen requires it temporarily;
- tests should migrate toward DigiStream product language instead of protecting obsolete Echoo branding;
- internal CSS class names or file names containing `echoo-` may remain temporarily when renaming them would create unrelated risk, but they are implementation details and must not leak into visible copy.

Before declaring migration complete, search user-visible code and tests for stale `Echoo` strings and classify each result as intentional internal compatibility or obsolete visible branding.

---

## 3. Typography — final authority

The current UI must stop using typewriter/mono styling as an ordinary product voice.

### 3.1 Primary family

Use a clean contemporary sans-serif for the entire normal product UI.

Preferred production family:

```css
--ds-font-sans: "Manrope", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

If Manrope is not already available, implementation may add a maintained font package such as `@fontsource/manrope` or use an equivalent self-hosted source. Do not silently fall back to a visually unrelated novelty font.

### 3.2 Technical mono

```css
--ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
```

Mono is restricted to genuinely technical content such as:

- IDs;
- correlation/reference numbers;
- diagnostics;
- logs;
- timestamps when technical treatment is useful;
- code/configuration snippets;
- low-priority infrastructure metadata.

### 3.3 Mono prohibitions

Do **not** use monospace by default for:

- buttons;
- nav labels;
- form labels;
- ordinary paragraphs;
- hero copy;
- card titles;
- marketing copy;
- empty/error state prose;
- footer links;
- primary status labels.

### 3.4 Type scale

Recommended mobile / desktop values:

| Role | Mobile | Desktop | Weight |
|---|---:|---:|---:|
| Marketing hero | 42–48px | 56–68px | 750–800 |
| Application H1 | 30–34px | 34–40px | 700–750 |
| H2 | 24–28px | 28–32px | 700 |
| H3 | 19–22px | 20–24px | 650–700 |
| Row/card title | 15–17px | 15–18px | 600–650 |
| Body | 15–17px | 15–17px | 400–500 |
| Secondary/meta | 12–14px | 12–14px | 400–500 |
| Button/nav | 14–16px | 14–16px | 600–650 |

Rules:

- marketing hero must not consume nearly the entire first mobile viewport;
- application headings must stay smaller than marketing headings;
- paragraphs use comfortable line-height around 1.45–1.65;
- long text uses a sensible max width;
- typography, not giant containers, should create hierarchy.

---

## 4. Colour and surface contract

### Foundation

- cream dotted canvas: `#F7F3EE` family;
- white/warm-white surface: near `#FFFDF9` / `#FFFFFF`;
- near-black text: around `#1F2025`;
- soft neutral dividers/borders.

### Brand

Dusty pink remains the main product accent.

Use for:

- principal CTA where appropriate;
- selected navigation punctuation;
- brand marks;
- key non-semantic emphasis;
- occasional primary chart series.

### Supporting tints

Allowed restrained families:

- lavender;
- sky;
- mint;
- amber;
- peach/rose.

Normally use no more than one or two supporting families in one visible region.

They are grouping colours, not lifecycle meanings.

### Semantic state

Live, success/ready, warning/reconnecting, danger/error and info must use dedicated evidence-backed semantic treatments. Decorative colours never redefine state.

---

## 5. Geometry, borders and elevation

### Radius

- normal controls/panels: 6–10px;
- mobile sheets/modal exceptions: up to 12px where composition benefits;
- pills only for badges/chips;
- avatars circular.

Do not force square geometry and do not use giant pill cards everywhere.

### Borders

- light neutral borders/dividers for ordinary structure;
- stronger border only for selected/focus/consequential emphasis.

### Shadows

- table/list rows: none;
- ordinary panel: none or subtle shadow;
- dropdown/search palette: modest floating shadow;
- modal/sheet: stronger soft elevation;
- hard-offset shadow: rare intentional marketing/brand accent only.

---

## 6. Spacing and density

Use shared spacing tokens based on 4px increments.

Operational screens must prioritize efficient scanning:

- repeated comparable records become rows/tables;
- avoid nested cards inside cards;
- avoid duplicate headings;
- avoid giant empty-state illustrations above the real next action;
- preserve at least 44px effective mobile touch targets;
- major sections have breathing room without excessive vertical travel.

---

## 7. Required shared component grammar

Before the UI migration may be called complete, the shared design system must contain or clearly own reusable equivalents of:

- `Button`, `LinkButton`, `IconButton`;
- `StatusBadge`, `StatusDot`;
- `PageHeader`, `SectionHeader`;
- `Sidebar`, `NavSection`, `NavItem`;
- mobile creator navigation;
- workspace/account switcher;
- `SearchField`, `CommandSearch`;
- `FilterTabs`;
- `DataTable`, `ResponsiveRecordRow`;
- `TaskRow`, `TaskList`;
- `LoadingState`;
- `EmptyState`, `ErrorState`, `OfflineState`, `UnauthorizedState`;
- `ApprovalCard` / shared confirmation dialog/sheet;
- `ContextCard` / context panel;
- `InsightCard`;
- `MessageRow`, `Composer`;
- `SelectionBar` where bulk actions really exist;
- shared Modal/Sheet focus, scroll-lock, Escape and Back behavior.

Adding two primitives and leaving the rest as giant feature-local cards is **not** completion.

---

## 8. Creator application shell

### Desktop

Use a compact Beautiful UI-quality sidebar, not a column of cards.

Suggested real structure when routes/capabilities exist:

```text
WORKSPACE
Overview
Broadcasts
Studio
Recordings
Analytics

AUDIENCE / PRODUCTION
Studio Lobby
Chat
Guests

ACCOUNT
Account
Settings
```

Requirements:

- compact 40–48px nav rows;
- subtle selected surface + dusty-pink punctuation/accent;
- small truthful counts only when backed by data;
- workspace/account context at bottom or top;
- search/command affordance where implemented;
- no giant icon tiles for normal navigation.

### Mobile

Use validated mobile navigation/drawer/bottom navigation. Do not squeeze the desktop sidebar into a phone.

---

## 9. Creator Overview

Overview answers:

1. What is happening now?
2. What is next?
3. What do I need to do?

Preferred composition:

- concise page header;
- one state-aware primary action;
- current live/recovering context;
- next scheduled/draft context;
- task/readiness rows for actual work;
- recent broadcasts/recordings as compact rows;
- trustworthy insight only when real;
- secondary actions with lower weight.

Do not make Overview a KPI-card showroom or a gallery of giant feature cards.

---

## 10. Broadcasts

Use a filterable record-oriented layout.

Desktop:

- page header + create action;
- lifecycle filter tabs;
- rows/table with title, channel, time, status and contextual action;
- no repeated generic `Open Studio` button on every lifecycle;
- action changes according to real state.

Mobile:

- compact stacked record rows;
- no forced horizontal table scrolling for ordinary use;
- critical action remains reachable.

---

## 11. Recordings

Use Records Table / responsive record rows.

Show only real:

- title;
- source broadcast/channel;
- duration when known;
- created/completed time;
- processing state;
- replay/publish availability;
- contextual actions.

Completed broadcast does not automatically mean recording/replay ready.

---

## 12. Studio

Studio is operational software, not a decorative dashboard.

Main work area may use a large solid white/warm-white panel inside the cream dotted shell.

Use compact Task Rows / context blocks for:

- microphone readiness;
- private Studio contribution;
- public listener delivery;
- selected organisation/channel/broadcast;
- live/reconnecting state;
- recording state when real.

Requirements:

- one critical primary action;
- stable critical controls;
- no fabricated percentages;
- private contribution never implies public delivery;
- reconnecting explains what remains healthy and what failed;
- diagnostics progressively disclosed;
- end-broadcast protected by explicit confirmation;
- small-phone and short-landscape controls remain reachable.

---

## 13. Studio Lobby, Backstage, Guests and Chat

Use compact human-communication grammar:

- participant rows with avatar/name/role/status/action;
- message rows with sender, body and time hierarchy;
- composer anchored safely above virtual keyboard;
- moderation actions secondary until needed;
- invited/on-stage/call-in grouping based on real product state;
- contextual details in Context Cards, not giant separate screens where unnecessary.

No AI reasoning traces or model controls.

---

## 14. Analytics

Only show analytics with a trustworthy source, scope and time range.

Use Insight Cards for a small number of decision-useful metrics, not decorative KPI boxes.

Every metric must define:

- data source;
- unit;
- time range;
- comparison basis if change is shown;
- unavailable/partial behavior.

If analytics are not trustworthy yet, hide the surface or show an honest unavailable state.

---

## 15. Account, settings, team and admin

Prefer structured sections, tables and compact rows over a long stack of giant cards.

Consequential actions such as revoke session, remove member, suspend user, delete recording or end broadcast use explicit Approval/Confirmation UI with consequence-specific copy.

---

## 16. Authentication and onboarding

Use the same modern sans typography and cream/white hybrid system.

Requirements:

- one obvious primary action;
- compact readable forms;
- no typewriter font on labels/buttons;
- errors near relevant fields;
- mobile keyboard does not hide active input or CTA;
- creator/listener intent remains clear;
- product branding says DigiStream.

---

## 17. Public landing page — explicit composition contract

The landing page must feel intentional, premium and lightweight. It must **not** look like a long stack of poster cards.

### 17.1 Mobile header

- DigiStream lockup left;
- compact login text/action;
- one clear sign-up/start action;
- header height roughly 64–72px;
- no oversized navigation controls.

### 17.2 Hero

Recommended order:

1. concise eyebrow only if useful;
2. headline;
3. one short explanatory paragraph;
4. primary CTA + secondary CTA;
5. one product/brand visual or proof element.

Mobile hero rules:

- headline normally 42–48px, line-height about 0.98–1.08;
- 2–4 lines maximum at common 360–430px widths;
- hero must not consume almost the entire first viewport before the user understands the CTA;
- paragraph width and line length remain controlled;
- CTA stack may become full-width on small phones;
- visual follows the message instead of pushing all useful content far below the fold.

### 17.3 Capabilities/features

Do not render four enormous full-width cards such as Live Broadcast / HD Audio / Private Calls / Record & Share.

Preferred mobile treatment:

- compact bordered rows or a 2-column compact tile grid when width allows;
- icon tile about 40–48px;
- title + one short line;
- subtle separators;
- restrained accent tint variation.

Desktop may use 2–4 compact columns, but cards remain proportionate and do not become giant posters.

### 17.4 How it works

Use three compact steps:

1. Create/schedule;
2. Prepare/go live;
3. Share/listen/replay.

On mobile these should be compact numbered rows/timeline blocks, not tall empty cards with one paragraph each.

### 17.5 Supporting sections

Use only sections that communicate real product value, for example:

- creator/community fit;
- audio quality/reliability explanation;
- Studio Lobby/guest collaboration;
- recording/replay availability when real;
- simple launch/pricing statement only when accurate.

Do not add decorative filler just to lengthen the page.

### 17.6 Final CTA

One concise final action before footer. Do not repeat five competing CTAs.

### 17.7 Footer

Footer must be a deliberate responsive layout.

Desktop example:

```text
DigiStream brand + short tagline

Product           Company           Legal
Discover          About             Privacy
Replays           ...               Terms
Sign in
```

Mobile:

- brand lockup and tagline first;
- link groups stacked or 2-column with clear headings;
- consistent spacing/alignment;
- no floating `Privacy Terms` on one side and `Discover Sign in` randomly elsewhere;
- no stale `Echoo` branding;
- footer links use normal sans-serif typography.

---

## 18. Listener/public product surfaces

Listener pages preserve playback-first hierarchy.

- current playback/state first;
- broadcast/channel identity next;
- secondary discovery/chat/call-in controls after;
- live/scheduled/replay distinction truthful;
- no giant creator-style dashboard cards;
- mobile controls remain thumb-reachable.

---

## 19. Loading, offline, empty and error states

System states must be compact, clear and responsive.

### Global connectivity banner

- text and action must never wrap into a vertical letter column;
- desktop: message + compact action in one row where space permits;
- mobile: message first, action below or at end with enough width;
- min-width/flex behavior must allow button label to remain horizontal;
- banner does not hide page content indefinitely.

### Blocking page state

- centered content width normally 420–560px;
- illustration/icon is supportive, not dominant;
- heading + concise explanation + one recovery action;
- do not make the state a giant empty poster unless the route truly cannot render anything else.

---

## 20. Search / command interface

Where supported by real routes/data, Command Search may provide:

- authorized resource search;
- route navigation;
- create broadcast;
- open current Studio;
- find broadcast/recording;
- switch workspace;
- open settings.

It must be keyboard accessible, permission-aware and must not duplicate business logic.

---

## 21. Motion

Motion communicates state and continuity.

- short control feedback;
- calm workspace transitions;
- no continuous expensive decoration;
- no fake success animation before authoritative confirmation;
- reduced-motion equivalent required.

---

## 22. Responsive acceptance matrix

Every touched major surface must be checked at minimum for:

- 360px-class Android portrait;
- 390–430px large phone portrait;
- short-height landscape;
- desktop Chromium;
- Android desktop-site mode where tests require it;
- 200% zoom-equivalent narrow layout where acceptance tests require it;
- virtual keyboard open for forms/chat;
- long names, URLs and descriptions;
- browser/Android Back and Escape behavior.

No ordinary horizontal page overflow.

---

## 23. Implementation rules for coding agents

Agents must:

1. inspect current implementation before editing;
2. build/reconcile shared primitives first;
3. migrate surfaces deliberately;
4. avoid broad regex/perl/sed replacements for visual properties across unrelated files;
5. preserve real routes/API/state;
6. update user-visible stale Echoo branding;
7. run typecheck/build/tests;
8. inspect responsive output rather than assuming token changes fixed layout;
9. keep working through all incomplete component families and screens instead of declaring success after foundation/token work.

A migration is not complete merely because colours, radius and shadows changed.

---

## 24. Completion gates

UI V2 is complete only when all applicable items are true:

- DigiStream branding is user-visible everywhere expected;
- modern sans typography is used for ordinary UI and marketing;
- mono is technical-only;
- landing page follows the explicit composition contract;
- footer is responsive and grouped correctly;
- creator sidebar/navigation is compact and coherent;
- Overview is not a giant-card gallery;
- Broadcasts and Recordings use record-oriented layouts;
- Studio uses truthful compact task/readiness hierarchy;
- Studio Lobby/Backstage/Guests/Chat use compact communication patterns;
- analytics is trustworthy or hidden/unavailable;
- account/settings/admin use structured rows/tables;
- shared Search, Filter, Table, Task, Loading, Approval, Context, Insight and communication primitives exist where product responsibilities require them;
- error/offline states are responsive and buttons do not collapse vertically;
- mobile and desktop acceptance passes;
- required typecheck/build/tests pass;
- no test was weakened only to hide a regression;
- no unresolved legacy dark/emerald or square/hard-shadow rule remains authoritative.

If one of these is materially incomplete, an agent must report the migration as incomplete and continue working rather than claiming the UI V2 is finished.
