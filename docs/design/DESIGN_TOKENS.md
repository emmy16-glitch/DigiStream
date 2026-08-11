# DigiStream Design Tokens — v2.1 Hybrid

Status: **authoritative semantic token contract for the web UI**

These tokens implement the design contract defined by:

- `DIGISTREAM_UI_CONSTITUTION.md`;
- `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
- `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`.

The key visual rule is:

> **cream dotted DigiStream canvas + white/neutral operational surfaces + dusty-pink brand anchor + restrained supporting accent tints + fixed semantic state colours.**

Token values should be implemented centrally in `apps/web/src/design-system/`. Do not scatter raw colour/radius/shadow values across feature CSS.

---

## 1. Foundation and canvas

```css
--ds-bg: #F7F3EE;
--ds-bg-dot: rgba(31, 32, 37, 0.09);

--ds-surface: #FFFDF9;
--ds-surface-white: #FFFFFF;
--ds-surface-subtle: #F4F2EF;
--ds-surface-neutral: #F7F7F8;
--ds-surface-hover: #FAFAFA;
--ds-surface-selected: #F5F2F3;

--ds-text: #1F2025;
--ds-text-secondary: #4D4A4B;
--ds-text-tertiary: #6B6464;
--ds-text-disabled: #9A9494;
--ds-text-inverse: #FFFFFF;

--ds-border: #DDD8D3;
--ds-border-strong: #C9C2BC;
--ds-border-emphasis: #8B8581;
```

Recommended application background:

```css
background-color: var(--ds-bg);
background-image:
  radial-gradient(circle, var(--ds-bg-dot) 1px, transparent 1.1px);
background-size: 20px 20px;
```

Do not replace the ordinary DigiStream app shell with a generic gray page background.

---

## 2. Brand accent

Dusty pink remains the principal DigiStream accent.

```css
--ds-brand: #D58F97;
--ds-brand-hover: #C97883;
--ds-brand-strong: #B85F6E;
--ds-brand-soft: #F8ECEE;
--ds-brand-soft-strong: #F1D9DD;
--ds-brand-border: #E7C0C6;
```

Use for:

- brand-primary emphasis;
- selected navigation punctuation;
- key call-to-action treatment where appropriate;
- primary chart series where suitable;
- occasional icon tiles/highlight surfaces.

Do not turn every card pink.

---

## 3. Supporting Beautiful UI-inspired accent palette

These colours exist to create restrained visual variety and grouping. They are **not lifecycle meanings**.

### Lavender

```css
--ds-accent-lavender: #8474D8;
--ds-accent-lavender-soft: #F1EEFC;
--ds-accent-lavender-border: #D9D2F4;
```

### Sky

```css
--ds-accent-sky: #4F86C6;
--ds-accent-sky-soft: #EDF5FD;
--ds-accent-sky-border: #CFE1F5;
```

### Mint

```css
--ds-accent-mint: #5E9D85;
--ds-accent-mint-soft: #EDF7F2;
--ds-accent-mint-border: #CCE8DC;
```

### Amber

```css
--ds-accent-amber: #B98344;
--ds-accent-amber-soft: #FFF5E7;
--ds-accent-amber-border: #F0D9B5;
```

### Peach / rose

```css
--ds-accent-peach: #C77D6E;
--ds-accent-peach-soft: #FAEEEA;
--ds-accent-peach-border: #ECCFC7;
```

### Accent use rules

- normally no more than 1–2 supporting accent families should appear in the same visible region;
- use soft tints more often than saturated fills;
- supporting accents may distinguish context, category, insight card, icon tile or selected secondary content;
- never rely on these accents to communicate lifecycle status;
- mint must not be confused with success;
- amber must not be confused with warning;
- sky must not become a replacement global brand blue;
- lavender must not become a new product-wide primary colour.

---

## 4. Semantic state palette

Semantic colours are separate from decorative accents.

```css
--ds-live: #C9342C;
--ds-live-soft: #FDEDEC;
--ds-live-border: #F3C3BF;

--ds-success: #2F7D57;
--ds-success-soft: #EAF6EF;
--ds-success-border: #B9DFC9;

--ds-warning: #A66C2E;
--ds-warning-soft: #FFF4E5;
--ds-warning-border: #EACB9D;

--ds-danger: #B53A36;
--ds-danger-soft: #FDEDEC;
--ds-danger-border: #F2C3C0;

--ds-info: #3F6FA8;
--ds-info-soft: #EDF4FC;
--ds-info-border: #C9DAEE;
```

Rules:

- `live` means actual live/public lifecycle state;
- `success` means healthy/ready/successful, not merely primary;
- `warning` means degraded/reconnecting/attention;
- `danger` means destructive/error/failed;
- `info` means informational state;
- text/icon/structure remains mandatory so colour is not the only signal.

---

## 5. Focus

```css
--ds-focus: #6A5ACD;
--ds-focus-ring: 0 0 0 3px rgba(106, 90, 205, 0.24);
```

Focus may use a high-visibility accent that differs from the primary brand, provided contrast and consistency remain strong.

---

## 6. Typography

Use the production-safe application sans already available in the project unless a repository-approved font is bundled.

```css
--ds-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

Mono is reserved for technical metadata, IDs, diagnostics, code-like values and occasional timestamps where it helps scanning.

Suggested scale:

```css
--ds-text-xs: 0.75rem;
--ds-text-sm: 0.875rem;
--ds-text-md: 1rem;
--ds-text-lg: 1.125rem;
--ds-text-xl: 1.25rem;
--ds-text-2xl: 1.5rem;
--ds-text-3xl: 1.875rem;
--ds-text-4xl: 2.25rem;
```

```css
--ds-leading-tight: 1.2;
--ds-leading-heading: 1.3;
--ds-leading-body: 1.5;
--ds-leading-relaxed: 1.65;
```

```css
--ds-weight-regular: 400;
--ds-weight-medium: 500;
--ds-weight-semibold: 600;
--ds-weight-bold: 700;
```

---

## 7. Spacing

```css
--ds-space-1: 4px;
--ds-space-2: 8px;
--ds-space-3: 12px;
--ds-space-4: 16px;
--ds-space-5: 20px;
--ds-space-6: 24px;
--ds-space-8: 32px;
--ds-space-10: 40px;
--ds-space-12: 48px;
--ds-space-16: 64px;
```

Typical use:

- icon/text gap: 8px;
- related controls: 8–12px;
- row internal gap: 12–16px;
- panel padding: 16–24px;
- major section gap: 24–40px;
- page padding: 16–24px mobile, 24–40px desktop.

Avoid arbitrary one-off spacing unless geometry requires it.

---

## 8. Radius

```css
--ds-radius-xs: 4px;
--ds-radius-sm: 6px;
--ds-radius-md: 8px;
--ds-radius-lg: 10px;
--ds-radius-xl: 12px;
--ds-radius-pill: 999px;
```

Recommended:

- ordinary input/button: 6–8px;
- card/panel: 8–10px;
- compact badge/chip: pill where appropriate;
- avatar: pill/circle.

Avoid 20–28px radii everywhere.

---

## 9. Borders

```css
--ds-border-width: 1px;
--ds-border-default: 1px solid var(--ds-border);
--ds-border-strong-rule: 1px solid var(--ds-border-strong);
```

Use borders and dividers more than shadows for tables, repeated rows and nested information.

---

## 10. Shadows

The hybrid system preserves DigiStream personality without applying a hard offset shadow to everything.

```css
--ds-shadow-none: none;
--ds-shadow-xs: 0 1px 2px rgba(31, 32, 37, 0.05);
--ds-shadow-sm: 0 1px 4px rgba(31, 32, 37, 0.08);
--ds-shadow-md: 0 6px 18px rgba(31, 32, 37, 0.12);
--ds-shadow-lg: 0 14px 32px rgba(31, 32, 37, 0.15);

/* Rare signature accent only, not ordinary app elevation. */
--ds-shadow-brand-offset: 4px 5px 0 rgba(31, 32, 37, 0.92);
```

Usage:

- table/row: usually none;
- ordinary panel/card: none or xs;
- command search/dropdown: md;
- modal/sheet: lg when needed;
- brand/marketing hero or intentionally tactile featured moment: optional brand-offset shadow.

Do not use the brand-offset shadow on every operational component.

---

## 11. Control sizing

```css
--ds-control-sm: 32px;
--ds-control-md: 36px;
--ds-control-lg: 40px;
--ds-control-touch: 44px;
```

Compact desktop controls may be visually smaller while retaining usable interaction targets. Mobile critical controls should generally meet touch-friendly sizing.

---

## 12. Layout roles

```css
--ds-page-max: 1440px;
--ds-content-max: 1180px;
--ds-reading-max: 720px;
--ds-sidebar-width: 240px;
--ds-sidebar-compact-width: 216px;
```

These are system roles, not fixed dimensions for every page. Studio may use a wider operational workspace.

---

## 13. Motion

```css
--ds-duration-instant: 80ms;
--ds-duration-fast: 140ms;
--ds-duration-normal: 200ms;
--ds-duration-slow: 280ms;

--ds-ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ds-ease-enter: cubic-bezier(0, 0, 0, 1);
--ds-ease-exit: cubic-bezier(0.3, 0, 1, 1);
```

No animation may fabricate success or product state.

---

## 14. Z-index roles

```css
--ds-z-base: 0;
--ds-z-sticky: 10;
--ds-z-dropdown: 30;
--ds-z-overlay: 40;
--ds-z-modal: 50;
--ds-z-toast: 60;
```

Do not invent arbitrary large z-index values feature by feature.

---

## 15. Status mapping

| Product state | Semantic role |
|---|---|
| draft | neutral |
| scheduled | info/neutral |
| overdue scheduled | warning |
| starting | info/warning depending on authoritative state |
| live | live |
| reconnecting | warning |
| ending | warning/neutral |
| completed | success/neutral depending on context |
| cancelled | neutral |
| failed | danger |
| recording processing | info |
| recording ready | success |
| recording failed | danger |

Text remains mandatory.

---

## 16. Component colour guidance

### Sidebar

- shell remains cream/dotted around the navigation region;
- sidebar itself may be warm white/solid surface;
- selected item may use brand-soft or a pale supporting tint;
- active punctuation/icon may use dusty pink;
- do not use a different accent colour for every nav row.

### Tables

- white/warm-white surface;
- neutral dividers;
- soft hover;
- selected row may use brand-soft or neutral selected surface;
- status colours remain semantic only.

### Insight cards

- use brand-soft, lavender-soft, sky-soft, mint-soft, amber-soft selectively;
- normally 2–3 visible card colour families max in one analytics section;
- real semantic warnings/errors override decorative tint.

### Task rows

- neutral structure;
- stage icon/status uses semantic state;
- do not paint every row with a different decorative colour.

### Chat

- neutral/warm-white message area;
- subtle accent can distinguish selected tab/current-user treatment;
- moderation/error/live states remain semantic.

### Loading

- neutral loader on warm-white surface;
- optional brand accent in the active progress element;
- percentage only when real.

### Approval dialog

- neutral/warm-white surface;
- safe action neutral;
- destructive action danger;
- ordinary non-destructive approval may use brand accent.

---

## 17. Raw-value policy

A new raw colour, radius, shadow, control height or motion value in feature CSS is a review smell.

Allowed exceptions require a real reason such as:

- browser/media element behavior;
- chart geometry;
- safe-area calculation;
- icon/artwork geometry;
- provider compatibility.

Promote reusable values to semantic tokens.

---

## 18. Migration rule

When touching legacy UI:

1. preserve or restore the cream dotted shell where appropriate;
2. move dense inner surfaces toward white/neutral Beautiful UI-like hierarchy;
3. retain dusty pink as the main brand accent;
4. introduce supporting accent tints only with intentional mapping;
5. replace repeated heavy shadows with border/divider structure;
6. migrate oversized repeated cards toward rows/tables where comparison matters;
7. keep compatibility aliases temporarily only when needed for safe staged migration;
8. remove obsolete aliases after migration and tests are complete.
