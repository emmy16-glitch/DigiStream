# DigiStream AI Implementation Guardrails

This file is written for Codex, Claude Code, coding agents, and human implementers. It exists to stop visual drift while the approved 50-screen DigiStream redesign is implemented.

## 1. Read-before-edit contract

For any change that touches frontend layout, CSS, design-system primitives, navigation presentation, authentication UI, creator UI, listener UI, Studio, Backstage, Recordings, analytics, settings, modals, forms, or responsive behavior, read these sources before editing:

1. `docs/design/DIGISTREAM_UI_CONSTITUTION.md`
2. `docs/design/REFERENCE_INDEX.md`
3. the exact reference image(s) for the screen being changed in `docs/design/reference/screens/`
4. `apps/web/AGENTS.md`
5. product-truth and lifecycle documents referenced by root `AGENTS.md`
6. existing implementation and tests

Do not begin implementation from memory after scanning one image.

## 2. Two authorities: visual truth and product truth

The approved reference images are authoritative for:

- composition and hierarchy;
- the cream dotted canvas;
- dusty-pink visual language;
- square geometry;
- hard black offset shadows;
- typographic contrast between heavy grotesk and mono/typewriter text;
- spacing rhythm;
- card density;
- control shape;
- overall personality.

The backend/API/product documents and current validated domain logic are authoritative for:

- permissions and roles;
- tenant isolation;
- lifecycle transitions;
- whether a metric exists;
- whether a user may perform an action;
- whether a broadcast is scheduled, live, reconnecting, ended, failed, or completed;
- recording/replay availability;
- media readiness;
- error handling and recovery.

Never fabricate product state to make a screenshot appear more exact.

## 3. Absolute visual prohibitions

A change fails design review if it introduces any of the following without explicit written approval:

- blue as the general brand/accent color;
- the original blue/white DigiStream visual system;
- the previous near-black/emerald design as the general application theme;
- generic gray SaaS dashboard backgrounds;
- 12px–24px rounded cards;
- pill-shaped primary navigation;
- blurred drop shadows for primary surfaces;
- glassmorphism or frosted panels;
- gradient-heavy primary UI;
- Inter used as the only product font;
- arbitrary colors for each chart/status;
- decorative neon glows;
- Material-UI-looking default components;
- a different bottom-navigation vocabulary on every screen;
- one-off CSS values when an existing design token should be used.

## 4. Required visual signature

Every ordinary DigiStream application screen must preserve the recognizable signature:

- warm cream/off-white base;
- subtle repeating dot grid;
- near-black ink;
- dusty pink primary accent;
- strong black grotesk display hierarchy;
- mono/typewriter labels, metadata, controls, and system text;
- square cards and controls;
- thin visible borders;
- zero-blur hard shadows offset down/right;
- deliberate negative space;
- restrained semantic green/amber/rose.

A screen should still look like DigiStream with the logo removed.

## 5. Screenshot implementation protocol

Before implementing a screen:

1. Locate the exact numbered reference image.
2. Open it and inspect the whole page, not only the target component.
3. List the shared components visible in it.
4. Reuse existing product components where their responsibility is already correct.
5. Map screenshot colors, spacing, type, borders, and shadows to Constitution tokens.
6. Identify screenshot data that is illustrative only.
7. Replace illustrative data with real API-backed state.
8. Implement desktop/mobile behavior from system rules, not by hardcoding screenshot dimensions.
9. Add loading, empty, error, unauthorized, offline, long-content, and recovery states in the same visual language.
10. Compare the finished screen against the reference at the same viewport.
11. Fix obvious drift before requesting review.

## 6. Component-first rule

Do not reproduce the 50 references by creating 50 isolated CSS files full of copied pixel values.

Implement and reuse shared primitives for:

- shells and headers;
- bottom navigation;
- page headings;
- cards and compact rows;
- buttons;
- fields and selectors;
- icon tiles;
- status badges;
- metric cards;
- broadcast artwork containers;
- tabs and filters;
- modals and sheets;
- tables;
- charts;
- empty/loading/error states.

If three screens use nearly the same visual pattern, that pattern should normally become or reuse a shared component.

Do not create a second page, second modal, second Studio, second Broadcasts implementation, or duplicate API flow merely because a screenshot appears different from the current component. Realign the existing responsibility.

## 7. Fidelity hierarchy

When deciding what to match most closely, use this order:

1. overall shell and page composition;
2. typography hierarchy;
3. spacing rhythm;
4. component geometry;
5. cream/pink/ink palette;
6. hard-shadow treatment;
7. icon sizing/alignment;
8. fine decorative details.

Do not spend time reproducing a decorative line while the typography, spacing, or card geometry is visibly wrong.

## 8. Dense-screen exception

Studio, Backstage, Recordings, Live Chat, Team/Admin, and analytics screens may become visually noisy if every nested element receives a large hard shadow.

Use the Constitution hierarchy:

- major surfaces: major shadow;
- primary/selected controls: control shadow;
- compact important tiles: small shadow;
- nested rows, internal cells, table rows, and low-priority metadata: border only.

Do not abandon the system; reduce elevation intelligently.

## 9. Responsive rule

The reference images are targets, not fixed canvases.

Implementation must work at:

- small Android portrait;
- large Android/iPhone portrait;
- short-height landscape;
- tablet;
- desktop;
- Android desktop-site simulation where current tests require it.

Never solve responsiveness by shrinking text until it becomes unreadable.
Never allow horizontal overflow for ordinary app content.
Use progressive disclosure for dense operational details.
Preserve safe-area and virtual-keyboard behavior.

## 10. Navigation rule

Do not infer navigation independently on each page.

Public shell:

- Discover
- Replays
- Sign in

Listener shell:

- Home
- Discover
- Replays
- My Library
- More

Creator shell:

- Home
- Broadcasts
- Lobby
- Chat
- More

Existing product architecture may use internal route names that differ. Preserve route compatibility while presenting consistent user-facing vocabulary.

## 11. State integrity

Never show:

- fake listener numbers;
- fake analytics;
- fake health percentages;
- fake duration;
- replay buttons for nonexistent artifacts;
- green readiness without evidence;
- live styling for scheduled content;
- active controls that the current user is not authorized to use;
- fake successful uploads;
- fake recording availability;
- fake public delivery merely because a private microphone connection exists.

A visually accurate lie is a product bug.

## 12. Accessibility gate

Before considering a UI slice complete:

- text and controls meet practical contrast requirements;
- focus-visible is obvious;
- mouse/touch/keyboard states exist;
- 44px minimum touch targets are preserved;
- color is never the only status signal;
- long names and translated/expanded copy do not break layouts;
- reduced motion remains usable;
- dialogs/sheets restore focus and respect Back/Escape behavior;
- audio controls have accessible names;
- disabled and loading states remain understandable.

## 13. Do not redesign while implementing

The 50-screen pack already establishes the direction. Implementation is not permission to “improve” it into a different aesthetic.

If an agent believes a different visual solution is necessary, it must first document:

- what problem exists in the approved reference;
- why the Constitution cannot solve it;
- the proposed deviation;
- accessibility/product impact;
- affected shared components;
- whether the deviation should become a new system rule or remain screen-specific.

Without explicit approval, stay inside the approved language.

## 14. Existing legacy documents

Some older repository documents and existing CSS were written around an earlier dark/emerald or Echoo-influenced visual direction. Those files remain useful where they describe product behavior, accessibility, reliability, authorization, lifecycle, media handling, or component responsibility.

They are **not** visual authority when they conflict with:

- `DIGISTREAM_UI_CONSTITUTION.md`;
- `DESIGN_TOKENS.md`;
- the approved 50-screen reference pack.

Do not perform a mechanical global replacement of legacy CSS without understanding affected surfaces. Migrate visual primitives deliberately through the shared design system.

## 15. PR description requirement

Every UI/design PR should include a short section similar to:

```text
Design references: 01, 02, 03
Constitution sections: 2, 4, 6, 13
Existing surfaces reused: CreatorShell, BroadcastCard, Studio readiness panel
Deliberate deviations: none
Truth sources: organisation/channel/broadcast APIs
Responsive evidence: Android portrait, short landscape, desktop
Accessibility checks: focus, keyboard, touch targets, contrast, reduced motion
```

## 16. Visual completion checklist

Before closing a frontend PR, answer YES to all applicable items:

- I opened the relevant reference image(s).
- I read the UI Constitution.
- I used the cream dotted canvas where required.
- I used dusty pink, not legacy blue/green, for brand emphasis.
- Heading hierarchy uses the heavy grotesk voice.
- Metadata/labels use the mono voice.
- Cards/controls remain square.
- Shadows are hard, black, down/right, and blur-free.
- Navigation matches the correct shell.
- Real backend state drives actions/statuses.
- I did not duplicate an existing flow/component.
- Loading/empty/error/unauthorized states match the same design language.
- Mobile and desktop were both checked.
- No horizontal overflow was introduced.
- Accessibility states were checked.
- I compared the result against the reference before declaring completion.

If any answer is NO, the work is not visually complete.
