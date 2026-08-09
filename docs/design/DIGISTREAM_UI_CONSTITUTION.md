# DigiStream Design System / UI Constitution

Version 1.0 — derived from the approved final 50-screen DigiStream reference pack

## 0. Purpose

This document is the implementation contract for DigiStream UI. The approved 50-screen reference pack defines the product's visual direction; this Constitution turns that direction into reusable rules so engineers, Codex, Claude, designers, and future contributors do not drift into a generic SaaS interface.

If a screenshot and this Constitution disagree, **this Constitution wins for reusable system rules** and the screenshot wins for **screen-specific composition/content intent**. Backend/API/product documentation always wins for product truth, authorization, lifecycle, privacy, and real data availability.

The visual identity must read as:

> warm editorial broadcast tooling + technical console + community audio product

Never as:

> generic blue SaaS + rounded cards + soft shadows + Inter-everywhere dashboard

---

## 1. Non-negotiable visual principles

1. **Warm cream dotted canvas** is the default application background.
2. **Dusty pink is the primary brand accent.** Blue is not a DigiStream brand UI color.
3. **Near-black grotesk headings** carry hierarchy and personality.
4. **Monospace/typewriter typography** carries metadata, labels, controls, system states, timestamps, and technical copy.
5. **Cards and controls are square or almost square.** Rounded SaaS cards are not part of the system.
6. **Hard black offset shadows** are the signature elevation treatment.
7. **Borders are visible and intentional.** Components should feel constructed, printed, and tactile.
8. **Spacing is generous vertically and disciplined horizontally.**
9. **Color is restrained.** Semantic colors must mean something.
10. **Dense screens reduce shadow usage rather than abandon the design language.**
11. **Real product state always overrides decorative screenshot data.**
12. **Existing product surfaces are realigned, not duplicated merely to copy references.**

---

# 2. Core design tokens

The values below are normalized production tokens based on the approved pack. They intentionally remove small color variations introduced by generated reference images.

## 2.1 Color

| Token | Value | Usage |
|---|---:|---|
| `--ds-bg` | `#F7F3EE` | Main cream page background |
| `--ds-surface` | `#FFFDF9` | Cards, sheets, inputs, elevated surfaces |
| `--ds-surface-warm` | `#F2ECE6` | Subtle alternate surface |
| `--ds-ink` | `#1F2025` | Headings, borders, icons, primary text |
| `--ds-ink-soft` | `#4D4A4B` | Secondary readable text |
| `--ds-muted` | `#6B6464` | Metadata and subdued copy |
| `--ds-line-soft` | `#D8D0CA` | Internal rules, dividers, subtle borders |
| `--ds-grid-dot` | `#DDD6D1` | Background dot pattern |
| `--ds-pink-50` | `#F8ECEB` | Very light pink wash |
| `--ds-pink-100` | `#F0D2D1` | Soft selected states |
| `--ds-pink-300` | `#E7B6B6` | Icon tiles, secondary accents |
| `--ds-pink-500` | `#D58F97` | Main dusty pink accent |
| `--ds-pink-700` | `#B84E5F` | Strong pink text, active states, destructive emphasis |
| `--ds-success` | `#8DBA98` | Healthy / active / ready only |
| `--ds-warning` | `#C99A61` | Warning / reconnecting only |
| `--ds-danger` | `#B84E5F` | Destructive/error |
| `--ds-charcoal-panel` | `#202126` | Rare dark broadcast hero/player panels |

### Color rules

- Do not introduce brand blue, electric purple, cyan, or glossy gradients.
- Pink is for brand emphasis, selected states, primary actions, live accents, and important UI punctuation.
- Green is semantic only: active, healthy, connected, ready, successful.
- Amber is semantic only: warning, reconnecting, degraded.
- Red/dark rose is semantic only: destructive, failed, suspended, ended.
- Use pure white sparingly. Most large surfaces should be warm rather than clinical.
- Decorative broadcast cover art should stay inside cream / pink / charcoal / muted semantic colors.
- A color appearing once in a generated image does not automatically become a product token.

---

# 3. Background system

The DigiStream dotted field is a brand element, not decoration.

```css
.ds-app-background {
  background-color: #F7F3EE;
  background-image:
    radial-gradient(circle, rgba(31, 32, 37, 0.10) 1px, transparent 1.1px);
  background-size: 20px 20px;
}
```

Rules:

- Dot opacity should remain subtle. The pattern must never compete with text.
- Do not remove the dot grid on normal application screens merely to simplify implementation.
- Modal overlays may visually suppress the grid, but the underlying page should still use it.
- Dark player artwork may sit on top of the cream grid, but the surrounding page returns to cream.
- Do not use a blue-tinted gray application canvas.
- Large plain surfaces may use `--ds-surface` while the page behind them remains dotted.

---

# 4. Typography

## 4.1 Font families

Production recommendation:

```css
--font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
--font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
```

Optional editorial accent for rare marketing-only moments:

```css
--font-editorial: "Instrument Serif", Georgia, serif;
```

### Rules

- **Archivo** or an equivalent bold grotesk is the primary visual voice.
- **IBM Plex Mono** or an equivalent is the system/technical voice.
- Do not use Inter as the default for everything.
- Long paragraphs may use the grotesk regular face for readability; metadata and system copy remain mono.
- Editorial serif is optional and restricted to marketing hero statements or cover-art typography. It must never become the default app font.
- Font substitutions must preserve the same visual character: heavy neutral grotesk + readable technical mono.

## 4.2 Type scale

| Style | Mobile | Desktop | Weight | Family |
|---|---|---|---|---|
| Display | 40/44 | 52/56 | 800 | Grotesk |
| H1 | 36/40 | 44/48 | 800 | Grotesk |
| H2 | 28/34 | 34/40 | 750–800 | Grotesk |
| H3 | 22/28 | 24/30 | 700 | Grotesk |
| Card title | 18/24 | 20/26 | 700 | Grotesk |
| Body | 16/25 | 17/27 | 400–500 | Grotesk or mono by context |
| Mono body | 15/24 | 16/25 | 400 | Mono |
| UI label | 12/18 | 13/18 | 600 | Mono |
| Button | 14/18 | 15/20 | 600 | Mono |
| Metadata | 12/18 | 13/19 | 400 | Mono |

### Typography behavior

- H1/H2 should be near-black and visually heavy.
- Large headings may wrap deliberately; do not shrink text merely to force one-line headings.
- Labels may use uppercase with `letter-spacing: 0.06em–0.10em`.
- Do not set long paragraphs in all caps.
- Do not use light font weights for important UI.
- Use mono to communicate system-ness, not as a novelty on every sentence.
- On dense screens, use the grotesk for longer explanatory copy so scanning remains comfortable.

---

# 5. Spacing system

Use a strict 4px base scale.

```text
4  8  12  16  20  24  32  40  48  64  80  96
```

## 5.1 Page spacing

| Context | Horizontal padding | Major vertical gap |
|---|---:|---:|
| Small mobile | 20px | 32–40px |
| Large mobile | 24px | 40–48px |
| Tablet | 28–32px | 48–64px |
| Desktop | 40–48px | 64–96px |

### Rules

- Use tighter horizontal spacing than vertical spacing.
- Give major sections breathing room.
- Do not fill every empty area with cards.
- Dense operational screens may use 20–24px vertical card gaps but should retain strong page-level separation.
- Internal component spacing should be systematic rather than eyeballed screen by screen.
- Repeated rows should use consistent padding and alignment.

---

# 6. Borders, corners, and elevation

## 6.1 Borders

```css
--ds-border: 1px solid #1F2025;
--ds-border-soft: 1px solid #D8D0CA;
```

Major cards, modal surfaces, primary buttons, tab groups, and large form panels use the dark border.

Internal dividers and secondary information use the soft border.

## 6.2 Radius

```css
--ds-radius-card: 0px;
--ds-radius-control: 0px;
--ds-radius-status: 2px;
--ds-radius-avatar: 999px;
```

Rules:

- Cards: square.
- Buttons: square.
- Inputs: square.
- Modals: square.
- Tabs: square.
- Tiny status pills may use 2–4px.
- Circular shapes are reserved for avatars, audio artwork motifs, radio indicators, and icon geometry.
- Never introduce 12px, 16px, or 24px SaaS card radii.

## 6.3 Hard shadows

```css
--ds-shadow-major: 6px 7px 0 #1F2025;
--ds-shadow-control: 4px 5px 0 #1F2025;
--ds-shadow-small: 3px 3px 0 #1F2025;
```

Rules:

- No blur.
- No translucent floating shadow.
- Large cards and modals: major shadow.
- Buttons and selected controls: control shadow.
- Very dense rows may use only border or small shadow.
- Shadow must always move down/right.
- Nested surfaces must not all receive the largest shadow.

### Press interaction

```css
.ds-button:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 2px 0 #1F2025;
}
```

This gives controls a tactile printed-button feel without relying on glossy animation.

---

# 7. Iconography

Use one consistent outline icon family, preferably Lucide or an equivalent 1.75–2px stroke system.

Rules:

- Default icon color: `--ds-ink`.
- Pink is allowed for active/brand controls.
- Avoid mixed filled icon families.
- Icon tiles are square, bordered, and usually use `--ds-pink-50` or `--ds-pink-100`.
- Do not use multicolor decorative icons for normal controls.
- Photos are acceptable for real people/participants; decorative illustration should stay within the system palette.

Recommended icon tile:

```css
.ds-icon-tile {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: #F0D2D1;
  border: 1px solid #1F2025;
  box-shadow: 3px 3px 0 #1F2025;
}
```

---

# 8. Buttons

## 8.1 Primary

- Dusty pink background.
- Dark border.
- Dark text/icon.
- Hard offset shadow.
- No radius.
- Minimum height: 48px.
- Minimum touch target: 44×44px.
- Use clear verbs: `Go live`, `Continue`, `Join backstage`, `Listen live`, `Save changes`.

```css
.ds-button-primary {
  min-height: 48px;
  padding: 0 20px;
  background: #E7B6B6;
  color: #1F2025;
  border: 1px solid #1F2025;
  box-shadow: 4px 5px 0 #1F2025;
  font-family: var(--font-mono);
  font-weight: 600;
}
```

## 8.2 Secondary

Cream/surface background with the same dark border and hard shadow.

## 8.3 Quiet

Text-only or border-only. No hard shadow unless the control is a major action.

## 8.4 Destructive

Use dusty rose/danger, not bright system red. The label must clearly state the consequence: `End broadcast`, `Suspend account`, `Sign out`.

## 8.5 Disabled and loading

- Disabled must never look like a usable pink primary action.
- Loading must preserve button width and surrounding layout.
- Do not display success until the real operation succeeds.
- Spinner/progress treatment must remain readable in the mono/system language.

---

# 9. Cards and containers

## 9.1 Major card

Use for primary content, broadcast summaries, stats groups, forms, and modal-like blocks.

```css
.ds-card {
  background: #FFFDF9;
  border: 1px solid #1F2025;
  box-shadow: 6px 7px 0 #1F2025;
  padding: 24px;
}
```

## 9.2 Compact row

For recordings, team members, saved broadcasts, sessions, and settings.

- Border is mandatory.
- Shadow may be small or omitted on very dense lists.
- 16–20px vertical padding.
- Keep one clear title, one metadata line, one action area.

## 9.3 Pink feature card

Use pale pink for featured/selected/live areas. Do not use pink on every card.

## 9.4 Dark media card

Charcoal is allowed for immersive broadcast artwork, countdown/player hero modules, or replay cover art. It must never become the general application background.

## 9.5 Nested hierarchy

Do not create card-inside-card-inside-card compositions where every level has a border and major shadow. Use dividers, whitespace, and flat inner rows where appropriate.

---

# 10. Inputs and forms

Inputs are rectangular, warm, and deliberately visible.

```css
.ds-input {
  min-height: 52px;
  width: 100%;
  padding: 0 16px;
  background: #FFFDF9;
  color: #1F2025;
  border: 1px solid #1F2025;
  border-radius: 0;
  font-family: var(--font-mono);
}
```

Focus:

```css
.ds-input:focus-visible {
  outline: 2px solid #D58F97;
  outline-offset: 2px;
}
```

Rules:

- Labels sit above inputs.
- Labels use mono, often uppercase.
- Help text uses muted mono.
- Error text uses `--ds-danger`.
- Do not rely on pink/red color alone; pair errors with text/icon.
- Form sections should be grouped into bordered panels, not floating unstructured fields.
- Required/optional status must be written clearly.
- Long validation messages must wrap without breaking card width.

---

# 11. Tabs, segmented controls, and filters

Use bordered rectangular segments.

Selected state:

- Pale pink fill.
- Dark text.
- Optional dusty pink bottom rule.
- No pill-shaped tabs.

For a five-part status filter such as `All / Draft / Scheduled / Live / Ended`, use equal-width rectangular segments where possible.

Compact category filters may be separate square buttons with a small hard shadow.

On mobile, horizontally scrollable tab groups are acceptable when all labels remain readable and the active item remains obvious.

---

# 12. Status system

Status labels use mono typography and restrained semantic color.

| Status | Treatment |
|---|---|
| Live | pink/rose dot + label |
| Active / Ready / Healthy | muted green |
| Scheduled | pale pink or neutral |
| Draft | neutral gray |
| Processing | dusty pink with progress indicator |
| Warning / Reconnecting | amber |
| Ended / Archived | neutral gray |
| Error / Suspended | dark rose |

Rules:

- Never use random colors merely to make statuses look different.
- Every color must have semantic meaning.
- Status text must remain understandable without color.
- Scheduled content must never use live pulse animation.
- Healthy/private contribution must not be presented as public-delivery readiness unless real delivery evidence exists.

---

# 13. Navigation architecture

The reference pack contains public, listener, and creator contexts. These are separate shells. Individual screens must not invent new primary navigation.

## 13.1 Public shell

Top navigation:

`DigiStream` | `Discover` | `Replays` | `Sign in`

No creator tools. No account workspace selector for signed-out public users.

## 13.2 Listener shell

Header:

`DigiStream` + listener profile/account affordance.

Primary mobile navigation:

`Home` | `Discover` | `Replays` | `My Library` | `More`

Do not rename these per screen.

## 13.3 Creator shell

Header:

`DigiStream` or `DigiStream Creator` + account/workspace control. Notification and monitoring controls may appear where relevant.

Primary mobile navigation:

`Home` | `Broadcasts` | `Lobby` | `Chat` | `More`

`Recordings`, `Stats`, `Settings`, and workspace utilities belong inside `More`, a desktop navigation region, or contextual subnavigation based on the current product architecture. Do not randomly replace primary navigation labels from screen to screen.

## 13.4 Live studio context

When live, contextual Studio actions may appear above the stable navigation. Product-critical controls must remain reachable without turning the entire application navigation into a different system.

## 13.5 Route compatibility

User-facing vocabulary may evolve while internal route names remain stable. Preserve route/backward compatibility where product docs require it; do not fork routes solely to match screenshot wording.

---

# 14. Header rules

### Public header

- Brand left.
- Public links right on desktop.
- Thin bottom divider.
- No heavy floating shadow.
- Mobile may reduce public links into a compact menu if necessary.

### Authenticated header

- Brand left.
- Account/workspace identity right.
- Square avatar tile may use pink fill and hard shadow.
- Dropdown menus use cream surface, dark border, hard shadow.

### Creator utility header

Notifications, monitoring/headphone controls, and account controls may appear, but they must use the same square control language and must not visually compete with the page primary action.

---

# 15. Bottom navigation

- Fixed visual grid.
- Equal-width items.
- Cream surface.
- 1px dark border.
- Optional major/control shadow depending on container treatment.
- Active item uses pale pink fill and/or dusty pink underline.
- Icons sit above labels.
- Label family: mono.
- No rounded floating nav bar.
- Mobile safe-area padding must be respected.
- Labels must not change simply because the current screen changes.

---

# 16. Modals, confirmations, and sheets

Examples include end-broadcast confirmation, suspend-account confirmation, invitation flows, and request-to-speak.

Rules:

- Warm cream surface.
- Dark 1px border.
- Major hard shadow.
- No generic rounded dialog.
- Central warning icon tile may use dusty pink/semantic treatment.
- One clear H2.
- Short consequence statement.
- Secondary action first, destructive/primary action second where appropriate.
- Destructive action must be explicit, never `OK`.
- Overlay: neutral dark at approximately 30–40% opacity.
- Focus must be trapped while modal is active.
- Escape/browser Back/Android Back behavior must be safe and deterministic.
- Focus must restore to the invoking control after closure.

Bottom sheets may be used for mobile interactions. The sheet container may use a minimal platform-level top radius only when needed for native affordance, but its inner cards/controls remain square and system-compliant.

---

# 17. Broadcast artwork

Broadcast artwork is where the product can have the most visual variation, but it must not break the brand.

Approved art palette:

- Dusty pink
- Pale blush
- Warm peach
- Warm cream
- Charcoal / near-black
- Muted green only where conceptually appropriate

Rules:

- Avoid bright blue and electric purple.
- Avoid glossy gradients.
- Prefer circles, waves, thin arcs, audio lines, typographic covers, and simple editorial geometry.
- Cover text may use a display serif as an exception.
- Keep covers visually flatter and more printed than glossy.
- Real uploaded artwork is allowed to contain broader colors; the surrounding DigiStream UI must still preserve its own palette and hierarchy.

---

# 18. Charts and analytics

Analytics should feel like DigiStream, not a third-party dashboard.

Rules:

- Primary series: dusty pink.
- Secondary series: charcoal or pale pink.
- Success/health series: muted green.
- Warning series: amber only where semantically warranted.
- Grid lines: light warm gray.
- Labels: mono.
- Cards: cream with dark border.
- Avoid blue default chart palettes.
- Avoid rainbow dashboards.
- Prefer direct labels and simple line/bar charts.
- Reduce hard shadows on nested mini-chart cards when the page is already dense.
- Never invent analytics to fill an empty reference state.
- When a metric does not exist, omit it or explain availability honestly rather than displaying fake zeroes.

---

# 19. Density hierarchy

Hard shadow is a hierarchy tool, not mandatory decoration on every object.

Use:

- **Major shadow:** page hero card, modal, major form, major content group.
- **Control shadow:** primary buttons, selected tiles, segmented controls.
- **Small shadow:** important compact card.
- **No shadow:** internal table rows, secondary metadata cells, separators.

This rule is especially important for Broadcast Studio, Recordings, Backstage, Live Chat, Team/Admin, and Analytics screens.

When a dense screen feels noisy, reduce nested elevation before changing the palette, radius, or typography system.

---

# 20. Responsive behavior

## Mobile first

- Side padding: 20–24px.
- Stack two-column cards vertically.
- Preserve typography scale; do not shrink body copy below readable sizes.
- Full-width primary actions when appropriate.
- Tables become stacked rows or horizontally scroll inside a bordered surface only when a stacked transformation would destroy meaning.
- Secondary actions may collapse into overflow menus.
- Bottom navigation remains visible for application contexts unless a focused live operation intentionally replaces it.
- Respect safe areas and virtual keyboard behavior.

## Tablet

- 2-column grids allowed.
- 28–32px page padding.
- Major cards may share rows when each remains readable.
- Do not simply stretch mobile cards to huge widths.

## Desktop

- Max content width: approximately 1180–1240px for most editorial/application pages unless an operational Studio genuinely needs more.
- Center the main content region.
- 40–48px horizontal padding.
- Do not enlarge everything to fill a wide monitor.
- Preserve generous negative space.
- Use 2–3 column metric grids only where content benefits.

## Short-height landscape

Operational controls, modals, and live critical actions must remain reachable without excessive vertical travel. Use progressive disclosure and sticky critical actions where appropriate rather than shrinking touch targets.

---

# 21. Motion and interaction

DigiStream motion should feel mechanical and deliberate.

Recommended:

- Button press: 100–140ms.
- Hover: small shadow/translation response only; avoid floating-card animation.
- Modal enter: 150–180ms fade + 4px translate.
- Tab switch: 120–160ms.
- Live pulse: subtle opacity pulse only when truly live.
- Reconnecting: simple rotating/dotted indicator with text.

Avoid:

- Springy cards.
- Excessive hover scaling.
- Glass blur.
- Parallax.
- Constant decorative motion.
- Fake progress percentages.
- Success animation before real operation confirmation.

Respect `prefers-reduced-motion` as a complete usable state, not an afterthought.

---

# 22. Accessibility

Non-negotiable:

- Body text target: 16px minimum.
- Touch targets: at least 44×44px.
- Focus indicators must be visible and pink/ink based.
- Do not encode status using color alone.
- Dusty pink text on pale pink must be checked for contrast; use darker `--ds-pink-700` when necessary.
- Secondary gray text must stay dark enough for readability.
- Form errors require text.
- Icon-only buttons require accessible labels.
- Audio state controls need accessible names such as `Pause live audio`, `Mute microphone`, `Open listener preview`.
- Long names, URLs, and user-generated content must wrap safely.
- Dialogs/sheets must manage focus, Back/Escape, scroll lock, and restoration.
- Motion must respect reduced-motion preference.
- Visual fidelity is never a reason to lower contrast or reduce touch-target size.

---

# 23. Content and voice

DigiStream UI copy should be concise, human, and operational.

### Headings

Human and direct:

- `Good morning, Emmanuel`
- `Set up your creator workspace`
- `You're almost live`
- `Listen live`
- `Your audience is waiting`

### System labels

Technical and mono:

- `LIVE NOW`
- `CURRENT CHANNEL`
- `PROCESSING`
- `LAST 7 DAYS`
- `MICROPHONE`
- `PLAYBACK HEALTH`

### Actions

Use verbs:

- `Go live`
- `Open studio`
- `Continue setup`
- `Request to speak`
- `Publish replay`
- `Save changes`

Avoid vague actions such as `Proceed`, `Okay`, or `Submit` when a more meaningful verb exists.

Do not expose unnecessary provider/internal terminology to ordinary users.

---

# 24. Screen-template rules

## Auth / onboarding

- Centered or clearly framed brand.
- One major bordered form card or choice group.
- Heavy black H1.
- Mono supporting copy.
- Pink primary CTA.
- Large vertical breathing room.
- Progress/step language must match real onboarding state.

## Creator dashboard

- H1 + short status line.
- One or two major cards first.
- Metrics after the primary task/state.
- Quick actions only when useful and authorized.
- Recent content in bordered list rows.
- One obvious contextual primary action.

## Settings

- Page title + mono description.
- Group controls inside major bordered cards.
- Section headings clearly separated.
- Destructive account actions isolated.
- Save actions reflect real dirty/loading/success/error state.

## Studio / backstage

- Live state visible at top when genuinely live.
- Broadcast identity grouped in one major card.
- Operational controls prioritized over analytics.
- Dense status cards may omit large shadows.
- End-broadcast action visually separated.
- Private contribution and public delivery readiness remain distinct.

## Listener

- Broadcast artwork/identity first.
- Listening control prominent.
- Chat/call-in secondary.
- Sign-in prompt appears only where needed.
- Request-to-speak explains what will happen.
- Player continuity should be preserved while safe secondary surfaces open.

## Analytics

- Explain timeframe and source.
- Show only trustworthy metrics.
- Use restrained chart colors.
- Prefer readable summaries over decorative data density.

---

# 25. Component ownership

Implement reusable components rather than screenshot-specific markup.

Minimum shared component set:

```text
AppShell
PublicHeader
ListenerHeader
CreatorHeader
CreatorBottomNav
ListenerBottomNav
PageHeading
Card
CompactRow
IconTile
Button
Input
Textarea
Select
Tabs
StatusBadge
MetricCard
BroadcastCard
BroadcastArtwork
PlayerControls
AudioWaveform
Modal
BottomSheet
Toast
EmptyState
UserAvatar
ProfileMenu
WorkspaceSwitcher
Table
ProgressBar
ChartCard
```

Every new screen should be assembled from the shared system before creating a new one-off component.

A lightweight orchestrator may coordinate existing surfaces, but it must not become a duplicate state machine or second API implementation.

---

# 26. AI/Codex/Claude implementation contract

Use the approved DigiStream 50-screen reference pack for screen intent and this Constitution for visual rules.

## DO

- use the warm cream dotted background;
- use dusty pink as the brand accent;
- use heavy near-black grotesk headings;
- use monospace/typewriter labels, metadata and controls;
- use square cards, inputs and buttons;
- use 1px dark borders;
- use hard down-right black shadows with zero blur;
- preserve generous vertical spacing;
- preserve the correct Public / Listener / Creator shell;
- reuse shared components and tokens;
- use semantic green/amber/rose only for states;
- keep broadcast artwork inside the approved restrained palette when DigiStream controls the artwork;
- preserve real backend state and authorization;
- compare implementation against the exact numbered reference before declaring completion.

## DO NOT

- introduce blue as a brand color;
- use the old blue/white DigiStream reference styling;
- use old dark-theme styling as the current visual target;
- use 12–24px rounded cards;
- use soft blurred shadows;
- use glassmorphism;
- use Inter everywhere;
- introduce arbitrary gradients;
- change bottom navigation labels screen by screen;
- create new colors for each status;
- copy screenshot inconsistencies into reusable components;
- create one-off CSS values when a design token exists;
- fake metrics, health, listener counts, readiness, recording state, or replay state;
- duplicate an existing product page merely to match a reference.

When a screenshot conflicts with the Constitution:

- follow the screenshot for content/composition intent;
- follow the Constitution for typography, color, borders, spacing, component shape, shadow, navigation presentation, and reusable behavior.

When either conflicts with product truth:

- follow backend/API/product truth and adapt the visual presentation without fabricating state.

---

# 27. Production CSS token starter

```css
:root {
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

  --ds-border: 1px solid var(--ds-ink);
  --ds-border-soft: 1px solid var(--ds-line-soft);

  --ds-shadow-major: 6px 7px 0 var(--ds-ink);
  --ds-shadow-control: 4px 5px 0 var(--ds-ink);
  --ds-shadow-small: 3px 3px 0 var(--ds-ink);

  --ds-font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
  --ds-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;

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
}
```

---

# 28. Merge-review checklist

A screen should not be approved until the answer to every applicable item is **yes**.

- Does the page use the cream dotted canvas where expected?
- Is dusty pink the primary brand accent?
- Are headings heavy, near-black and grotesk?
- Are system labels/metadata mono?
- Are cards/controls square?
- Are major shadows hard, black, offset down/right, and blur-free?
- Is the page using the correct Public, Listener, or Creator shell?
- Are navigation labels stable for that shell?
- Are colors coming from shared tokens?
- Are semantic colors used semantically?
- Is the vertical spacing generous and deliberate?
- Have nested/dense cards avoided unnecessary shadow noise?
- Are touch targets at least 44px?
- Are focus, error, status and live states accessible?
- Is there any accidental blue/white legacy styling? If yes, reject.
- Is there any accidental old dark-theme styling? If yes, reject unless it is an intentional media panel.
- Is there any generic rounded SaaS styling? If yes, reject.
- Is displayed data evidence-backed?
- Was the relevant numbered reference image opened and compared?
- Was an existing flow/component reused where responsibility already existed?
- Does the screen visually belong beside the approved 50 references without explanation?

---

# 29. Source-of-truth hierarchy

Use this order when making UI implementation decisions:

1. **Security, privacy, authorization, lifecycle and real backend/API truth.**
2. **DigiStream UI Constitution** — current reusable visual rules and implementation behavior.
3. **Approved final 50-screen DigiStream reference pack** — screen structure, composition, visual intent and state coverage.
4. **DigiStream AI Implementation Guardrails** — required implementation process for coding agents.
5. **Existing product/interaction documents** — behavior and responsibility, except where their old visual-theme guidance is explicitly superseded here.
6. **Existing implementation** — reuse responsibilities and preserve compatibility while realigning presentation.
7. **Legacy screenshots/reference packs** — content archaeology only; never current visual authority.

---

# 30. Final design principle

DigiStream should feel **purpose-built**, not templated.

The product is warm without becoming soft, technical without becoming cold, editorial without becoming decorative, and bold without becoming chaotic.

If a new UI decision makes the product look more like a generic SaaS dashboard, the implementation has probably drifted away from the approved direction.
