# DigiStream Design Tokens

These tokens translate the approved visual direction into an implementation contract. Exact colour values remain provisional until WCAG contrast checks are completed in-browser.

## Colour roles

```css
:root {
  color-scheme: dark;

  --ds-canvas: #07090d;
  --ds-surface-1: #0c0f14;
  --ds-surface-2: #11151b;
  --ds-surface-3: #171c23;
  --ds-surface-hover: #1c222a;

  --ds-border-subtle: #20262f;
  --ds-border-default: #2a313b;
  --ds-border-strong: #3a434e;

  --ds-text-primary: #f7f9fb;
  --ds-text-secondary: #b6bdc7;
  --ds-text-muted: #858e9a;
  --ds-text-disabled: #5e6670;

  --ds-accent: #2ddd59;
  --ds-accent-hover: #42e86b;
  --ds-accent-active: #20c94b;
  --ds-accent-soft: rgba(45, 221, 89, 0.12);
  --ds-accent-border: rgba(45, 221, 89, 0.42);

  --ds-success: #45df70;
  --ds-warning: #f3b63f;
  --ds-danger: #f05b61;
  --ds-info: #5da8ff;

  --ds-focus-ring: #8df2a4;
  --ds-overlay: rgba(0, 0, 0, 0.72);
}
```

Do not treat these hex values as approved merely because they appear here. Validate small text, buttons, badges, chart lines and focus rings against WCAG 2.2 AA before finalising them.

## Typography

Preferred family:

```css
--ds-font-sans: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
--ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
```

Suggested scale:

```css
--ds-text-xs: 0.75rem;
--ds-text-sm: 0.875rem;
--ds-text-md: 1rem;
--ds-text-lg: 1.125rem;
--ds-text-xl: 1.375rem;
--ds-text-2xl: 1.75rem;
--ds-text-3xl: 2.25rem;
--ds-text-display: clamp(2rem, 4vw, 3.5rem);
```

Line heights:

```css
--ds-leading-tight: 1.15;
--ds-leading-heading: 1.25;
--ds-leading-body: 1.55;
```

Weights:

```css
--ds-weight-regular: 400;
--ds-weight-medium: 500;
--ds-weight-semibold: 600;
--ds-weight-bold: 700;
```

## Spacing

Use a 4 px base scale.

```css
--ds-space-1: 0.25rem;
--ds-space-2: 0.5rem;
--ds-space-3: 0.75rem;
--ds-space-4: 1rem;
--ds-space-5: 1.25rem;
--ds-space-6: 1.5rem;
--ds-space-8: 2rem;
--ds-space-10: 2.5rem;
--ds-space-12: 3rem;
--ds-space-16: 4rem;
```

## Shape

```css
--ds-radius-sm: 0.5rem;
--ds-radius-md: 0.75rem;
--ds-radius-lg: 1rem;
--ds-radius-xl: 1.25rem;
--ds-radius-pill: 999px;
```

Do not create arbitrary radii per component. Nested cards may use one step smaller than their parent.

## Borders and shadows

```css
--ds-border-width: 1px;
--ds-shadow-card: 0 12px 32px rgba(0, 0, 0, 0.22);
--ds-shadow-dialog: 0 28px 80px rgba(0, 0, 0, 0.52);
--ds-glow-live: 0 0 24px rgba(45, 221, 89, 0.16);
```

Prefer borders and tonal separation over heavy shadows.

## Motion

```css
--ds-duration-fast: 120ms;
--ds-duration-normal: 200ms;
--ds-duration-slow: 320ms;
--ds-ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

Motion rules:

- transitions clarify state changes rather than decorate them;
- live pulses and animated waveforms stop or simplify under `prefers-reduced-motion`;
- do not animate critical text or controls continuously;
- reconnecting and loading indicators must include readable labels.

## Layout

```css
--ds-sidebar-width: 228px;
--ds-page-max: 1600px;
--ds-content-gap: 1rem;
--ds-control-min-height: 44px;
```

Suggested breakpoints:

```css
--ds-breakpoint-mobile: 640px;
--ds-breakpoint-tablet: 900px;
--ds-breakpoint-desktop: 1200px;
```

CSS custom properties cannot be used directly in media-query conditions in current browser implementations, so keep matching values in the styling build configuration.

## Component state requirements

Every interactive component must support:

- default;
- hover;
- pressed/active;
- focus-visible;
- disabled;
- loading;
- error where applicable.

Minimum interactive target: 44 by 44 px.

Focus style example:

```css
:focus-visible {
  outline: 2px solid var(--ds-focus-ring);
  outline-offset: 3px;
}
```

## Status patterns

### Live

- pulsing broadcast/dot icon;
- explicit `Live` or `Live now` label;
- elapsed time where useful;
- never green colour alone.

### Healthy

- success icon;
- `Healthy`, `Good` or `Excellent` label based on defined thresholds;
- subtle green badge or border.

### Waiting

- clock/waiting icon;
- amber treatment;
- action or explanation.

### Degraded

- warning icon;
- amber treatment;
- impact and recovery guidance.

### Failed/offline

- error icon;
- red treatment;
- direct retry, diagnostics or support action.

## Data visualisation

- chart colours must remain distinguishable for common colour-vision deficiencies;
- every chart needs labels, tooltips and a table or textual summary;
- never rely on green versus red alone;
- use consistent definitions for listener, unique listener, peak, average listening time and returning listener;
- show collection windows and update delay.

## Iconography

Use one coherent outline icon set. Avoid mixing emoji, text glyphs and unrelated icon styles in production UI.

Core icons include:

- home/overview;
- broadcast signal;
- audience/users;
- recording/play;
- analytics/chart;
- settings;
- microphone;
- headphones;
- volume/mute;
- share;
- link/copy;
- calendar/time;
- lock/private;
- check/success;
- warning;
- failure/offline;
- search/filter;
- notification;
- more actions.

## Naming convention

CSS variables: `--ds-*`

React components: descriptive PascalCase, such as:

- `StatusBadge`
- `LiveIndicator`
- `AudioLevelMeter`
- `WaveformPlayer`
- `ListenerPreview`
- `EmptyState`
- `ConnectionHealthPanel`

Avoid component names tied to one screenshot or sample organisation.
