# DigiStream Design Review Checklist

Use this checklist for human review and AI-agent self-review before merging frontend/UI work.

## A. DigiStream identity

- [ ] Warm cream dotted canvas remains present on ordinary DigiStream application shells where expected.
- [ ] The dotted pattern is subtle and does not reduce readability.
- [ ] White/warm-white/neutral inner operational surfaces provide clean contrast against the cream canvas.
- [ ] Dusty pink remains the principal brand accent.
- [ ] Supporting lavender/sky/mint/amber/peach colours are restrained and intentional.
- [ ] Supporting colours are not being used as accidental lifecycle semantics.
- [ ] Near-black text provides the main hierarchy.
- [ ] The screen does not look like generic gray/white SaaS with the DigiStream identity removed.
- [ ] The screen also does not look like the old all-cream/all-pink oversized-card implementation.

## B. Beautiful UI adaptation quality

- [ ] The exact Beautiful UI pattern being adapted is named or obvious from the implementation.
- [ ] The adaptation follows `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`.
- [ ] The live reference was inspected when network access was available, or the local adaptation standard was used when offline.
- [ ] Compact density was borrowed without shrinking touch targets or text into unusability.
- [ ] Repeated comparable records use rows/tables instead of giant cards where appropriate.
- [ ] Search, task rows, loading, approval, chat, context, insight or selection patterns are used only when they match a real DigiStream responsibility.
- [ ] No AI-specific Thinking/model/prompt/reasoning UI was introduced without a real AI product feature.
- [ ] No external source/assets were copied without license verification.

## C. Colour discipline

- [ ] Every colour maps to a known role: canvas, surface, brand, supporting accent, or semantic state.
- [ ] Normally no more than 1–2 supporting accent families appear in the same visible region.
- [ ] Pale tints are preferred over large saturated fills for secondary accents.
- [ ] Live has one consistent live treatment.
- [ ] Healthy/ready/success uses the semantic success treatment only when truthful.
- [ ] Warning/reconnecting/degraded uses the warning treatment only when truthful.
- [ ] Failed/destructive/error uses the danger treatment only when truthful.
- [ ] Colour is never the only state signal.

## D. Structure and hierarchy

- [ ] The page has one clear contextual primary action for the current state.
- [ ] Page title is not duplicated inside the first card/panel.
- [ ] Sections are separated by spacing/dividers before unnecessary wrapper cards are added.
- [ ] Cards are used for meaningful grouping rather than as the default wrapper for every item.
- [ ] Current/next/blocked state is immediately understandable on Overview.
- [ ] Studio keeps operational state and critical controls visually calm and stable.
- [ ] Dense screens use borders/dividers more than nested shadows.
- [ ] Any hard-offset shadow is a rare intentional brand/hero accent rather than default component elevation.
- [ ] Radius is restrained and consistent rather than square-everywhere or pill-everywhere.

## E. Shared component architecture

- [ ] Existing `apps/web/src/design-system/` primitives were searched before adding a new component.
- [ ] Equivalent existing primitives were reused or safely extended.
- [ ] Shared presentation behavior is not duplicated page by page.
- [ ] Generic design-system components do not own authorization, lifecycle, recording or media truth.
- [ ] The change does not create a duplicate page, Studio, Broadcasts flow, Recordings flow, Studio Lobby, auth flow or onboarding flow.

## F. Product truth

- [ ] No screenshot placeholder is presented as real data.
- [ ] No fake listener count, health score, analytics metric, retention value or trend was added.
- [ ] No fake progress percentage or stage was added.
- [ ] Lifecycle status is backed by real state.
- [ ] Scheduled content does not look live.
- [ ] Microphone readiness is not confused with private Studio contribution.
- [ ] Private contribution is not confused with public listener delivery.
- [ ] Completed broadcast is not automatically treated as recording/replay ready.
- [ ] Recording/replay actions appear only when real and authorized.
- [ ] Permission state is real and server-backed.

## G. Loading, progress and recovery

- [ ] Loading feedback is appropriate for the type of wait.
- [ ] Determinate percentage is shown only when measurable.
- [ ] Success appears only after authoritative API/media confirmation.
- [ ] Loading does not unexpectedly change control width or layout.
- [ ] Failures have a bounded recovery action when one exists.
- [ ] Scheduled waiting content is not animated as active work.

## H. Destructive/consequential actions

- [ ] Consequential actions use explicit labels such as `End broadcast`, `Delete recording`, `Suspend user`, etc.
- [ ] Consequences are stated briefly and factually.
- [ ] Safe/cancel action is clear.
- [ ] Destructive styling uses semantic danger treatment.
- [ ] Double submission/stale state is handled safely.
- [ ] Server authorization still controls the operation.

## I. Navigation and search

- [ ] Creator navigation uses stable real product vocabulary.
- [ ] Desktop navigation is compact and scannable.
- [ ] Active state is subtle but obvious.
- [ ] Workspace switching uses real memberships/context.
- [ ] Search/command results are authorized.
- [ ] Search empty state is understandable.
- [ ] Search keyboard navigation and focus behavior are complete.
- [ ] Mobile navigation is the validated mobile pattern, not a squeezed desktop sidebar.

## J. Accessibility and responsiveness

- [ ] Small Android portrait is usable.
- [ ] Large phone portrait is usable.
- [ ] Short-height landscape is usable where applicable.
- [ ] Desktop Chromium is usable.
- [ ] Android desktop-site simulation passes where CI requires it.
- [ ] 200% zoom passes where acceptance coverage requires it.
- [ ] No ordinary horizontal overflow exists.
- [ ] Text remains readable without forced shrinking.
- [ ] Touch targets are usable.
- [ ] Focus-visible is obvious.
- [ ] Keyboard/touch/mouse behavior is equivalent where supported.
- [ ] Dialog/sheet focus trap and restoration are correct.
- [ ] Escape and browser/Android Back close the correct top layer.
- [ ] Virtual keyboard does not hide active input/composer/critical action.
- [ ] Reduced-motion mode remains complete.

## K. Tests and documentation

- [ ] User-visible copy was checked against acceptance tests before being changed.
- [ ] Protected product language such as `Studio Lobby` was not shortened casually.
- [ ] Typecheck passes.
- [ ] Relevant unit/API tests pass.
- [ ] Production build passes.
- [ ] Relevant Playwright/responsive suites pass.
- [ ] Meaningful product/accessibility tests were not deleted just to make the redesign pass.
- [ ] Documentation is updated when a shared visual/product contract intentionally changes.

## Final identity questions

- [ ] If the DigiStream logo were removed, would the cream/dotted shell + colour system + interaction grammar still feel recognizably DigiStream?
- [ ] Does the screen feel like **DigiStream with Beautiful UI-quality component craft**, rather than a clone of Beautiful UI?
- [ ] Is it cleaner and denser than the old oversized-card UI without losing DigiStream's personality?

If any final answer is no, do not declare the UI visually complete.
