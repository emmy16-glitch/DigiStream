# DigiStream Design Tokens — v2

Status: **authoritative semantic token contract for the web UI**

These tokens implement the neutral, compact DigiStream v2 system defined by `DIGISTREAM_UI_CONSTITUTION.md` and `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`.

The old cream dotted canvas and hard-offset-shadow token set is superseded.

Token values should be implemented centrally in `apps/web/src/design-system/` and consumed semantically. Do not scatter raw color/radius/shadow values across feature CSS.

---

## 1. Color tokens

### 1.1 Neutral foundation

```css
--ds-bg: #F7F7F8;
--ds-surface: #FFFFFF;
--ds-surface-subtle: #F3F4F6;
--ds-surface-hover: #F9FAFB;
--ds-surface-selected: #F2F4F7;

--ds-text: #101828;
--ds-text-secondary: #475467;
--ds-text-tertiary: #667085;
--ds-text-disabled: #98A2B3;
--ds-text-inverse: #FFFFFF;

--ds-border: #E4E7EC;
--ds-border-strong: #D0D5DD;
--ds-border-emphasis: #98A2B3;
```

### 1.2 Brand accent

DigiStream brand accent remains selective. It must not become a full-page wash.

```css
--ds-brand: #D58F97;
--ds-brand-hover: #C97883;
--ds-brand-soft: #F8ECEE;
--ds-brand-border: #E8C4C9;
```

The brand accent may be changed in a future explicit rebrand, but agents must change it centrally and update this document. Do not invent a different accent per feature.

### 1.3 Semantic state

```css
--ds-live: #D92D20;
--ds-live-soft: #FEF3F2;
--ds-live-border: #FECDCA;

--ds-success: #067647;
--ds-success-soft: #ECFDF3;
--ds-success-border: #ABEFC6;

--ds-warning: #B54708;
--ds-warning-soft: #FFFAEB;
--ds-warning-border: #FEDF89;

--ds-danger: #B42318;
--ds-danger-soft: #FEF3F2;
--ds-danger-border: #FECDCA;

--ds-info: #175CD3;
--ds-info-soft: #EFF8FF;
--ds-info-border: #B2DDFF;
```

Rules:

- `live` means actually live/public lifecycle state, not merely healthy;
- `success` means successful/healthy/ready, not the default primary button;
- `warning` means attention/degraded/reconnecting;
- `danger` means destructive/error/failed;
- `info` is informational, not a general brand replacement;
- status meaning must also be communicated with text/icon/structure.

### 1.4 Focus

```css
--ds-focus: #2E90FA;
--ds-focus-ring: 0 0 0 3px rgba(46, 144, 250, 0.24);
```

Focus color may be blue because it is a semantic accessibility signal, not a brand accent.

---

## 2. Typography tokens

Use the existing production-safe sans family unless a repository-approved font is already bundled. Do not add a font dependency merely to mimic an external reference.

```css
--ds-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

`Inter` is allowed in v2 as an application sans. The previous rule prohibiting Inter-everywhere is superseded. Mono remains reserved for technical metadata/IDs/diagnostics rather than ordinary product prose.

Suggested type tokens:

```css
--ds-text-xs: 0.75rem;     /* 12 */
--ds-text-sm: 0.875rem;    /* 14 */
--ds-text-md: 1rem;        /* 16 */
--ds-text-lg: 1.125rem;    /* 18 */
--ds-text-xl: 1.25rem;     /* 20 */
--ds-text-2xl: 1.5rem;     /* 24 */
--ds-text-3xl: 1.875rem;   /* 30 */
--ds-text-4xl: 2.25rem;    /* 36 */
```

Suggested line heights:

```css
--ds-leading-tight: 1.2;
--ds-leading-heading: 1.3;
--ds-leading-body: 1.5;
--ds-leading-relaxed: 1.65;
```

Weights:

```css
--ds-weight-regular: 400;
--ds-weight-medium: 500;
--ds-weight-semibold: 600;
--ds-weight-bold: 700;
```

---

## 3. Spacing tokens

Use a 4px base system:

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

Semantic spacing guidance:

- compact icon/text gap: 8px;
- related controls: 8–12px;
- row internal gap: 12–16px;
- panel padding: 16–24px;
- major section gap: 24–40px;
- page padding: 16–24px mobile, 24–40px desktop.

Do not create arbitrary `17px`, `23px`, `37px` spacing values without a specific layout requirement.

---

## 4. Radius tokens

```css
--ds-radius-xs: 4px;
--ds-radius-sm: 6px;
--ds-radius-md: 8px;
--ds-radius-lg: 10px;
--ds-radius-xl: 12px;
--ds-radius-pill: 999px;
```

Default usage:

- standard input/button: `--ds-radius-sm` or `--ds-radius-md`;
- primary panel/card: `--ds-radius-md` or `--ds-radius-lg`;
- compact badge/status chip: `--ds-radius-pill` when appropriate;
- avatar: `--ds-radius-pill`.

Avoid 20–28px radii as the default application grammar.

---

## 5. Border tokens

```css
--ds-border-width: 1px;
--ds-border-default: 1px solid var(--ds-border);
--ds-border-strong-rule: 1px solid var(--ds-border-strong);
```

Use border structure more often than shadow structure for tables, rows and nested panels.

---

## 6. Shadow tokens

The previous hard black offset shadows are obsolete for ordinary application UI.

```css
--ds-shadow-none: none;
--ds-shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.05);
--ds-shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04);
--ds-shadow-md: 0 4px 12px rgba(16, 24, 40, 0.10);
--ds-shadow-lg: 0 12px 24px rgba(16, 24, 40, 0.12);
```

Usage:

- table/row: usually none;
- card/panel: none or xs;
- dropdown/command search: md;
- modal/sheet: lg where appropriate.

No neon glow, no permanent heavy shadow, no nested shadow stacks.

---

## 7. Control sizing

```css
--ds-control-sm: 32px;
--ds-control-md: 36px;
--ds-control-lg: 40px;
--ds-control-touch: 44px;
```

Desktop compact controls may visually be 32–40px high while still maintaining accessible target area where appropriate. Mobile critical controls should generally reach touch-friendly target sizing.

Do not shrink operational controls below usability requirements to achieve Beautiful UI-like density.

---

## 8. Layout tokens

```css
--ds-page-max: 1440px;
--ds-content-max: 1180px;
--ds-reading-max: 720px;
--ds-sidebar-width: 240px;
--ds-sidebar-compact-width: 216px;
```

These are starting system roles, not fixed requirements for every page. Studio may need wider operational layouts; auth/reading surfaces may use narrower widths.

---

## 9. Motion tokens

Follow the premium motion document for full behavior.

```css
--ds-duration-instant: 80ms;
--ds-duration-fast: 140ms;
--ds-duration-normal: 200ms;
--ds-duration-slow: 280ms;

--ds-ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ds-ease-enter: cubic-bezier(0, 0, 0, 1);
--ds-ease-exit: cubic-bezier(0.3, 0, 1, 1);
```

Rules:

- do not use long decorative transitions in operational flows;
- success timing comes from real state, not animation duration;
- reduced-motion mode must remain complete and understandable.

---

## 10. Z-index roles

Do not invent large arbitrary z-index numbers feature by feature.

```css
--ds-z-base: 0;
--ds-z-sticky: 10;
--ds-z-dropdown: 30;
--ds-z-overlay: 40;
--ds-z-modal: 50;
--ds-z-toast: 60;
```

Nested overlay behavior must still follow shared modal/sheet ownership rules.

---

## 11. Status badge roles

Status components must use semantic mapping rather than feature-local color decisions.

Example mapping:

| Product state | Semantic role |
|---|---|
| draft | neutral |
| scheduled | info/neutral |
| starting | warning/info depending on actual state |
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

## 12. Component token rules

### Buttons

Primary button should usually use a strong neutral/brand treatment with clear enabled/disabled contrast. Do not use success green merely because an action is primary.

### Tables/rows

- white/neutral surface;
- subtle border/divider;
- selected row uses `--ds-surface-selected` and/or border emphasis;
- hover uses `--ds-surface-hover` where hover exists;
- status remains compact.

### Cards

- white/neutral surface;
- subtle border;
- modest radius;
- minimal/no shadow;
- no nested decorative frame by default.

### Search/command palette

- elevated overlay may use `--ds-shadow-md`;
- clear focus and keyboard selection state;
- rows remain compact.

### Dialog/sheet

- elevated modal surface;
- strong accessible focus behavior;
- clear title/consequence/action hierarchy;
- safe area on mobile.

---

## 13. Raw-value policy

A new raw color, radius, shadow, control height or motion value in feature CSS should be treated as a code-review smell.

Allowed exceptions require a concrete reason such as:

- browser/media element behavior;
- chart geometry;
- safe-area calculation;
- precise icon/artwork requirement;
- compatibility with an external provider surface.

If the value becomes reusable, promote it to a semantic token.

---

## 14. Migration rule

When touching legacy UI:

1. replace old cream/background/shadow/radius assumptions with semantic v2 tokens;
2. do not visually migrate an unrelated whole file merely because one selector changed unless the change is bounded and tested;
3. remove obsolete tokens only after confirming no remaining surface depends on them;
4. keep compatibility aliases temporarily only when needed for safe staged migration;
5. document aliases as deprecated and remove them when migration completes.
