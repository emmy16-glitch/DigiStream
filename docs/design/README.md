# DigiStream Design Documentation

This directory is the repository source of truth for DigiStream's approved product-design direction.

## Documents

- [Product Design Bible](DIGISTREAM_PRODUCT_DESIGN_BIBLE.md) — product identity, information architecture, screen requirements, components, states, responsive behaviour, accessibility and anti-drift rules.
- [Design Tokens](DESIGN_TOKENS.md) — provisional implementation tokens for colour, typography, spacing, shape, motion and status patterns.
- [Reference Index](REFERENCE_INDEX.md) — approved screen inventory and rules for using visual references honestly.

## Authority order

When implementation details disagree, apply this order:

1. Security, privacy and real backend authorization rules.
2. Shared API contracts and real data availability.
3. Product behaviour and state rules in the Product Design Bible.
4. Approved screen composition and visual direction.
5. Provisional token values.

The screenshots must never override security, invent data or imply an unavailable feature exists.

## Design change process

A material change to navigation, visual identity, core component behaviour, status language or screen hierarchy must update these documents in the same pull request.

UI pull requests should include:

- reference screen or rule followed;
- desktop, tablet and mobile evidence;
- loading, empty and error-state evidence;
- keyboard/focus notes;
- confirmation that displayed values are real or clearly unavailable;
- accessibility checks performed.
