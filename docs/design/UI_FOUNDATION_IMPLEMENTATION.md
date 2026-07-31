# DigiStream UI Foundation Implementation

This implementation turns the approved product design bible into shared web primitives without pretending that unimplemented metrics or product areas already exist.

## Included in this slice

- token-driven dark theme under `--ds-*` CSS custom properties;
- accessible global focus, reduced-motion and skip-link behaviour;
- central button, link-button and icon-button components;
- status badges that combine a symbol and text with colour;
- reusable loading, empty, error, offline and unauthorized state panels;
- reusable DigiStream brand lockup;
- responsive creator workspace shell;
- responsive listener shell;
- mobile creator bottom navigation and tablet compact rail;
- listener discovery migration to shared status and state components;
- creator dashboard migration away from illustrative metrics and sample broadcasts.

## Deliberate boundaries

This is the foundation, not a full visual rewrite.

The existing Broadcast Studio, guest waiting room, backstage, chat, call-in and player internals retain their current feature CSS until dedicated migration pull requests. They inherit global tokens and accessibility defaults immediately, while later slices will replace their one-off components deliberately.

The centralized icon adapter is transitional and prevents scattered symbols across new foundation code. A future dependency-reviewed icon package or repository-owned SVG set can replace its internal glyph map without changing component APIs.

## Data honesty changes

The previous dashboard displayed sample upcoming broadcasts and concrete counts. Those values were design placeholders rather than API data. The foundation now renders unavailable or empty states until authenticated organisation, recording and analytics data exists.

## Responsive contract

- Desktop: persistent creator sidebar and full listener header.
- Tablet: compact creator rail and wrapped listener navigation.
- Mobile: creator bottom navigation, compact page header and horizontally safe listener navigation.
- Minimum control height: 44 px.
- Warnings and primary live controls must remain outside collapsed secondary panels.

## Required follow-up migrations

1. Broadcast Studio and active live-control surfaces.
2. Guest waiting room and backstage workspace.
3. Listener player, call-in and public chat composition.
4. Forms, dialogs, tables and confirmation flows.
5. Real visual regression tests at mobile, tablet and desktop widths.
6. Measured WCAG 2.2 AA contrast verification in rendered browsers.

## Pull-request review evidence

Every later UI migration must include:

- the approved reference screen used;
- mobile, tablet and desktop screenshots;
- loading, empty and failure evidence;
- keyboard and focus behaviour;
- confirmation that each displayed value is real, estimated or unavailable.
