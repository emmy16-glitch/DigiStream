# DigiStream Design Tokens — UI V2

Status: **authoritative semantic token contract**

This file implements `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` and `DIGISTREAM_UI_CONSTITUTION.md`.

## Foundation

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

Application canvas:

```css
background-color: var(--ds-bg);
background-image: radial-gradient(circle, var(--ds-bg-dot) 1px, transparent 1.1px);
background-size: 20px 20px;
```

## Brand

```css
--ds-brand: #D58F97;
--ds-brand-hover: #C97883;
--ds-brand-strong: #B85F6E;
--ds-brand-soft: #F8ECEE;
--ds-brand-soft-strong: #F1D9DD;
--ds-brand-border: #E7C0C6;
```

Dusty pink is the principal brand accent. Do not paint every card pink.

## Supporting accents — non-semantic grouping only

```css
--ds-accent-lavender: #8474D8;
--ds-accent-lavender-soft: #F1EEFC;
--ds-accent-lavender-border: #D9D2F4;

--ds-accent-sky: #4F86C6;
--ds-accent-sky-soft: #EDF5FD;
--ds-accent-sky-border: #CFE1F5;

--ds-accent-mint: #5E9D85;
--ds-accent-mint-soft: #EDF7F2;
--ds-accent-mint-border: #CCE8DC;

--ds-accent-amber: #B98344;
--ds-accent-amber-soft: #FFF5E7;
--ds-accent-amber-border: #F0D9B5;

--ds-accent-peach: #C77D6E;
--ds-accent-peach-soft: #FAEEEA;
--ds-accent-peach-border: #ECCFC7;
```

Normally use no more than 1–2 supporting families in the same visible region.

Mint does not automatically mean success. Amber does not automatically mean warning. Supporting colours never replace semantic state.

## Semantic state

```css
--ds-live: #C9342C;
--ds-live-soft: #FDEDEC;
--ds-success: #2F7D57;
--ds-success-soft: #EAF6EF;
--ds-warning: #A66C2E;
--ds-warning-soft: #FFF4E5;
--ds-danger: #B53A36;
--ds-danger-soft: #FDEDEC;
--ds-info: #3F6FA8;
--ds-info-soft: #EDF4FC;
```

Use only for truthful lifecycle/health/semantic meaning.

## Typography

```css
--ds-font-sans: "Manrope", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
--ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
```

Normal UI uses `--ds-font-sans`.

Mono is technical-only and must not be the default for buttons, nav labels, forms, marketing copy, ordinary card titles, error/empty prose or footer links.

Suggested sizes:

```css
--ds-text-xs: 0.75rem;
--ds-text-sm: 0.875rem;
--ds-text-md: 1rem;
--ds-text-lg: 1.125rem;
--ds-text-xl: 1.375rem;
--ds-text-2xl: 1.75rem;
--ds-text-3xl: 2.125rem;
```

Marketing hero sizing should be implemented responsively with `clamp()` but should land roughly in the 42–48px mobile / 56–68px desktop range.

## Spacing

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
--ds-space-20: 80px;
--ds-space-24: 96px;
```

## Radius

```css
--ds-radius-xs: 4px;
--ds-radius-sm: 6px;
--ds-radius-md: 8px;
--ds-radius-lg: 10px;
--ds-radius-xl: 12px;
--ds-radius-pill: 999px;
```

Ordinary operational controls/panels generally use 6–10px. Do not force square geometry and do not use 20–28px radius everywhere.

## Elevation

```css
--ds-shadow-xs: 0 1px 2px rgba(31, 32, 37, 0.05);
--ds-shadow-sm: 0 1px 4px rgba(31, 32, 37, 0.08);
--ds-shadow-md: 0 6px 18px rgba(31, 32, 37, 0.12);
--ds-shadow-lg: 0 14px 32px rgba(31, 32, 37, 0.15);
--ds-shadow-brand-offset: 4px 5px 0 rgba(31, 32, 37, 0.92);
```

- table/list rows: no shadow;
- ordinary panels: none or `xs`;
- search/dropdowns: `sm`/`md`;
- modal/sheet: `md`/`lg`;
- hard offset: rare marketing/brand accent only.

## Motion

```css
--ds-motion-instant: 100ms;
--ds-motion-control: 160ms;
--ds-motion-surface: 200ms;
--ds-motion-overlay: 260ms;
--ds-motion-workspace: 320ms;
--ds-ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

Motion never fabricates success and must have a reduced-motion equivalent.

## Implementation rule

Production token values live centrally under `apps/web/src/design-system/`. Do not scatter raw colour/radius/shadow/font choices across feature CSS when a semantic token exists.
