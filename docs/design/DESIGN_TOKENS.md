# DigiStream Design Tokens

Status: **authoritative visual token contract**

These tokens normalize the approved final 50-screen DigiStream visual direction into reusable implementation values. Small color variations visible in generated references must not become separate production tokens.

## 1. Color

```css
:root {
  color-scheme: light;

  --ds-bg: #F7F3EE;
  --ds-surface: #FFFDF9;
  --ds-surface-warm: #F2ECE6;

  --ds-ink: #1F2025;
  --ds-ink-soft: #4D4A4B;
  --ds-muted: #6B6464;
  --ds-line-soft: #D8D0CA;
  --ds-grid-dot: #DDD6D1;

  --ds-pink-50: #F8ECEB;
  --ds-pink-100: #F0D2D1;
  --ds-pink-300: #E7B6B6;
  --ds-pink-500: #D58F97;
  --ds-pink-700: #B84E5F;

  --ds-success: #8DBA98;
  --ds-warning: #C99A61;
  --ds-danger: #B84E5F;
  --ds-charcoal-panel: #202126;
}
```

### Color rules

- Cream/off-white is the ordinary application canvas.
- Dusty pink is the primary brand accent.
- Near-black ink carries headings, borders, icons, and primary text.
- Do not reintroduce legacy DigiStream brand blue as a general UI accent.
- Green is semantic only: active, ready, healthy, connected, or successful.
- Amber is semantic only: waiting, warning, reconnecting, or degraded.
- Rose/danger is semantic only: destructive, failed, suspended, or critical.
- Charcoal may be used for immersive player/countdown/media artwork, not as the general application theme.
- Avoid rainbow charts, electric purple, cyan, neon glow, and arbitrary decorative gradients.

## 2. Background grid

The dotted canvas is a brand element.

```css
.ds-app-background {
  background-color: var(--ds-bg);
  background-image:
    radial-gradient(circle, rgba(31, 32, 37, 0.10) 1px, transparent 1.1px);
  background-size: 20px 20px;
}
```

The pattern must remain subtle enough that text and controls dominate.

## 3. Typography

Recommended production families:

```css
--ds-font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
--ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
--ds-font-editorial: "Instrument Serif", Georgia, serif;
```

Rules:

- heavy grotesk is the primary visual voice;
- mono/typewriter is the technical/system voice;
- do not use Inter as the only product font;
- editorial serif is optional and restricted to marketing/cover-art moments;
- long body copy may use the regular grotesk for readability.

Suggested scale:

```css
--ds-display-mobile: 2.5rem;
--ds-display-desktop: 3.25rem;
--ds-h1-mobile: 2.25rem;
--ds-h1-desktop: 2.75rem;
--ds-h2-mobile: 1.75rem;
--ds-h2-desktop: 2.125rem;
--ds-h3: 1.375rem;
--ds-card-title: 1.125rem;
--ds-body: 1rem;
--ds-mono-body: 0.9375rem;
--ds-ui-label: 0.75rem;
--ds-button-text: 0.875rem;
--ds-metadata: 0.75rem;
```

Line-height guidance:

```css
--ds-leading-display: 1.05;
--ds-leading-heading: 1.15;
--ds-leading-body: 1.55;
--ds-leading-mono: 1.55;
```

## 4. Spacing

Use a strict 4px base scale.

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

Page guidance:

- small mobile horizontal padding: 20px;
- large mobile: 24px;
- tablet: 28–32px;
- desktop: 40–48px;
- major vertical gaps should generally be larger than horizontal gaps.

## 5. Shape

```css
--ds-radius-card: 0px;
--ds-radius-control: 0px;
--ds-radius-status: 2px;
--ds-radius-avatar: 999px;
```

Rules:

- cards are square;
- inputs are square;
- buttons are square;
- tabs are square;
- modals are square;
- small status chips may use a minimal 2–4px radius;
- circular geometry is reserved for avatars, audio motifs, radio indicators, and intentional icon forms.

Do not introduce 12px–24px generic SaaS card radii.

## 6. Borders and hard shadows

```css
--ds-border: 1px solid var(--ds-ink);
--ds-border-soft: 1px solid var(--ds-line-soft);

--ds-shadow-major: 6px 7px 0 var(--ds-ink);
--ds-shadow-control: 4px 5px 0 var(--ds-ink);
--ds-shadow-small: 3px 3px 0 var(--ds-ink);
```

Rules:

- no blur on signature shadows;
- shadow moves down/right;
- major cards and dialogs use major shadow;
- primary buttons/selected controls use control shadow;
- compact important tiles may use small shadow;
- internal rows, table cells, and secondary nested surfaces may use border only to control visual noise.

Pressed interaction:

```css
.ds-button:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 2px 0 var(--ds-ink);
}
```

## 7. Controls

```css
--ds-control-min-height: 48px;
--ds-touch-min: 44px;
--ds-input-min-height: 52px;
```

Primary button:

```css
.ds-button-primary {
  min-height: var(--ds-control-min-height);
  padding: 0 20px;
  background: var(--ds-pink-300);
  color: var(--ds-ink);
  border: var(--ds-border);
  border-radius: 0;
  box-shadow: var(--ds-shadow-control);
  font-family: var(--ds-font-mono);
  font-weight: 600;
}
```

Input:

```css
.ds-input {
  min-height: var(--ds-input-min-height);
  width: 100%;
  padding: 0 16px;
  background: var(--ds-surface);
  color: var(--ds-ink);
  border: var(--ds-border);
  border-radius: 0;
  font-family: var(--ds-font-mono);
}

.ds-input:focus-visible {
  outline: 2px solid var(--ds-pink-500);
  outline-offset: 2px;
}
```

## 8. Motion

```css
--ds-duration-fast: 120ms;
--ds-duration-normal: 180ms;
--ds-duration-slow: 260ms;
--ds-ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

Motion should feel mechanical and deliberate rather than glossy or springy.

Avoid:

- floating-card hover animation;
- parallax;
- permanent glow;
- large spring effects;
- decorative continuous animation;
- motion that implies a state before real API/media confirmation.

Respect `prefers-reduced-motion`.

## 9. Status treatment

- **Live:** rose/pink dot + explicit label; never color alone.
- **Healthy / ready:** muted green + explicit label/icon.
- **Scheduled / draft:** pale pink or neutral treatment; no live pulse.
- **Waiting / reconnecting:** amber + explicit state copy.
- **Ended / archived:** neutral gray.
- **Error / suspended / destructive:** dark rose.

## 10. Charts

- primary series: dusty pink;
- secondary series: charcoal or pale pink;
- semantic success series: muted green;
- grid: warm light gray;
- labels: mono;
- chart cards: cream with dark border;
- avoid default blue chart palettes and rainbow dashboards.

## 11. Accessibility

- normal body text target: 16px minimum;
- touch targets: at least 44×44px;
- visible focus is mandatory;
- status meaning must survive without color;
- dusty-pink text on pale pink must use the darker rose token when contrast requires it;
- disabled controls must remain clearly different from enabled actions;
- long names and translated/expanded text must not cause horizontal overflow.

## 12. Relationship to references

The approved final 50-screen pack controls screen composition and visual intent. These tokens normalize that appearance into reusable production values. Do not create a new token merely because one generated image contains a slightly different cream, pink, or shadow offset.
