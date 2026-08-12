# DigiStream Design System / UI Constitution

Version 3.0 — **DigiStream cream-dotted identity + Beautiful UI-quality operational interface**

Status: **authoritative reusable visual-system contract, subordinate only to product truth and `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`**

## 0. Authority

For reusable presentation, read:

1. `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`;
2. this Constitution;
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. `DESIGN_TOKENS.md`;
5. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
6. reference screens for composition/journey intent.

Product authorization, tenant isolation, lifecycle, media readiness, privacy, reliability and accessibility always override presentation.

The visual system is:

> warm cream dotted DigiStream canvas + clean white/warm-white operational surfaces + dusty-pink brand anchor + restrained supporting colour tints + compact Beautiful UI-quality component grammar + modern readable sans-serif typography.

---

## 1. Non-negotiable principles

1. Cream dotted canvas remains a DigiStream signature.
2. Dusty pink remains the principal brand accent.
3. Inner operational surfaces may be white, warm-white, soft neutral or pale supporting tints.
4. Near-black text creates primary hierarchy.
5. Modern sans-serif is the normal product voice.
6. Monospace is technical-only.
7. Repeated comparable records prefer rows/tables over giant cards.
8. Cards are for meaningful grouping, not the default wrapper for every item.
9. Operational controls/panels use restrained 6–10px radius.
10. Borders/dividers do more structural work than shadow.
11. Hard offset shadow is a rare brand/marketing accent, not application-wide elevation.
12. One contextual primary action per state.
13. Semantic colours represent real evidence-backed state only.
14. Responsive/accessibility behavior is part of the design.
15. External references are adapted, not cloned.
16. User-visible branding is DigiStream.

Obsolete rules include dark/emerald default theme, blue/white generic SaaS, square-everything geometry, hard-shadow-everywhere, mono/typewriter buttons and labels, and giant all-cream/all-pink card stacks.

---

## 2. Application layering

### Layer 1 — brand canvas

```css
.ds-app-background {
  background-color: #F7F3EE;
  background-image: radial-gradient(circle, rgba(31,32,37,.09) 1px, transparent 1.1px);
  background-size: 20px 20px;
}
```

Rules:

- dots remain subtle;
- normal application shells preserve enough cream/dots to remain recognizably DigiStream;
- dense workspaces may place large solid inner panels over the canvas;
- modal overlays may suppress visible dots temporarily;
- do not replace the ordinary shell with a generic gray background.

### Layer 2 — operational surfaces

Use white/warm-white/soft-neutral for:

- tables;
- search palette;
- forms;
- Studio work areas;
- settings;
- chat;
- recording rows;
- analytics panels;
- dialogs/sheets.

### Layer 3 — brand/supporting accents

Dusty pink is primary brand emphasis.

Supporting non-semantic tints may include restrained:

- lavender;
- sky;
- mint;
- amber;
- peach/rose.

Normally use no more than 1–2 supporting accent families in the same visible region.

### Layer 4 — semantic state

Live, success/ready, warning/reconnecting, danger/error and info use stable dedicated treatments. Decorative tints never redefine status.

---

## 3. Typography

### Primary product family

```css
--ds-font-sans: "Manrope", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

Use for:

- headings;
- body copy;
- buttons;
- navigation;
- forms;
- cards/rows;
- landing page;
- auth/onboarding;
- footer;
- normal status labels.

### Technical mono

```css
--ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
```

Use only for genuinely technical metadata such as IDs, diagnostics, logs, technical timestamps and code/configuration snippets.

### Never default mono for

- buttons;
- nav labels;
- form labels;
- marketing copy;
- card titles;
- ordinary paragraphs;
- error/empty-state prose;
- footer links.

### Type scale

| Role | Mobile | Desktop | Weight |
|---|---:|---:|---:|
| Marketing hero | 42–48px | 56–68px | 750–800 |
| Application H1 | 30–34px | 34–40px | 700–750 |
| H2 | 24–28px | 28–32px | 700 |
| H3 | 19–22px | 20–24px | 650–700 |
| Row/card title | 15–17px | 15–18px | 600–650 |
| Body | 15–17px | 15–17px | 400–500 |
| Meta | 12–14px | 12–14px | 400–500 |
| Button/nav | 14–16px | 14–16px | 600–650 |

Rules:

- landing hero must not dominate nearly the entire first mobile viewport;
- application headings stay smaller than marketing headings;
- paragraphs use comfortable line-height;
- long text uses sensible max-width;
- hierarchy comes from type/spacing, not giant containers.

---

## 4. Spacing and density

Use a shared 4px-based scale:

```text
4 8 12 16 20 24 32 40 48 64 80 96
```

Guidance:

- mobile page padding: 16–24px;
- desktop page padding: 24–40px;
- compact row vertical padding: 10–14px;
- related control gaps: 8–12px;
- major section gaps: 24–48px;
- marketing sections may breathe more, but must not create pointless vertical travel.

Repeated data becomes rows/tables before giant cards.

---

## 5. Borders, radius and elevation

### Borders

Use light neutral borders/dividers for ordinary structure. Stronger boundaries are for selected/focus/consequential states.

### Radius

- controls/panels: usually 6–10px;
- modal/sheet: generally 8–12px;
- chips/badges: pill where useful;
- avatars: circular.

Do not force square geometry and do not use 20–28px radius everywhere.

### Elevation

- table/list row: no shadow;
- ordinary panel: none or subtle shadow;
- dropdown/search palette: modest floating shadow;
- modal/sheet: stronger soft elevation;
- hard-offset shadow: rare marketing/brand accent only.

No glassmorphism, neon glow or nested shadow stacks.

---

## 6. Required shared component direction

The shared design system must converge on reusable ownership for applicable equivalents of:

- Button / LinkButton / IconButton;
- StatusBadge / StatusDot;
- PageHeader / SectionHeader;
- Sidebar / NavSection / NavItem;
- mobile navigation;
- workspace/account switcher;
- SearchField / CommandSearch;
- FilterTabs;
- DataTable / ResponsiveRecordRow;
- TaskRow / TaskList;
- LoadingState;
- Empty / Error / Offline / Unauthorized states;
- ApprovalCard / confirmation dialog/sheet;
- ContextCard;
- InsightCard;
- MessageRow / Composer;
- SelectionBar where real;
- Modal/Sheet primitives.

Changing only token values and a couple of components is not UI V2 completion.

---

## 7. Navigation

Creator desktop uses compact sidebar rows, real workspace/account context, clear grouping and subtle selected state. It is not a stack of cards.

Mobile uses validated mobile navigation/drawer/bottom navigation rather than squeezed desktop sidebar.

Stable user-facing vocabulary must be preserved, including `Studio Lobby` where that distinction matters.

---

## 8. Major surface rules

### Overview

State-aware next-action dashboard, not KPI/card gallery. Current/next state first, compact task/readiness/recent rows next, insights only when real.

### Broadcasts

Filterable record-oriented layout; lifecycle-specific row actions; responsive stacked records on mobile.

### Recordings

Searchable/filterable record rows; truthful processing/replay state.

### Studio

Calm operational surface with compact readiness/context rows; private contribution and public delivery remain distinct; critical controls remain stable and reachable.

### Studio Lobby / Backstage / Guests / Chat

Compact participant/message hierarchy; composer safe above keyboard; role-aware actions; no AI reasoning UI.

### Analytics

Insight Cards only for trustworthy data with source, scope and time range. Hide/unavailable if data is not trustworthy.

### Account / Settings / Admin

Structured sections, rows/tables and explicit consequential confirmations rather than giant card stacks.

### Auth / Onboarding

Modern sans-serif forms; one obvious primary action; no mono labels/buttons; DigiStream branding.

### Listener/Public

Playback-first hierarchy, truthful live/scheduled/replay state, compact responsive controls.

---

## 9. Landing page and footer

The complete landing contract is in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` and is mandatory.

Summary:

- compact responsive header;
- controlled hero (42–48px mobile headline, not poster-scale);
- concise paragraph;
- clear primary/secondary CTA;
- one purposeful visual/proof element;
- compact capability rows/tiles, not four huge cards;
- compact three-step journey, not tall poster cards;
- only meaningful supporting sections;
- one final CTA;
- grouped responsive footer with DigiStream branding and clear Product/Company/Legal structure;
- no floating/misaligned footer links.

---

## 10. System states

Connectivity banners must not allow actions such as `Dismiss`/`Retry` to wrap into vertical letters.

Use deliberate flex/min-width/mobile stacking.

Blocking error/offline states normally use a compact centered content width with concise icon, heading, explanation and recovery action instead of a giant mostly-empty poster panel.

---

## 11. Motion

Motion explains state/continuity. It does not fabricate success. Use short purposeful transitions, stable controls and a complete reduced-motion mode. Live Studio becomes calmer, not more animated.

---

## 12. Responsive/accessibility

Every affected major surface must work for small Android portrait, larger phone portrait, short landscape, desktop, Android desktop-site mode where tested, 200% zoom-equivalent cases where tested, virtual keyboard, long content and Back/Escape behavior.

No ordinary horizontal page overflow. Preserve practical mobile touch targets and visible focus.

---

## 13. Branding cleanup

User-visible product name is DigiStream.

Visible `Echoo` strings must be removed or intentionally documented. Internal compatibility class/file names may remain temporarily when safe migration requires it.

---

## 14. Completion

A screen is not complete because colours/radius/shadows changed.

The entire UI V2 is complete only when the component and screen gates in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` are satisfied, responsive/accessibility acceptance passes, stale branding is reconciled and required CI is green.
