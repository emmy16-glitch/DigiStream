# DigiStream UI V2 Design Review Checklist

Use before declaring any frontend slice complete.

## Authority

- [ ] `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` was read.
- [ ] UI Constitution, Beautiful UI adaptation standard and design tokens were followed.
- [ ] Relevant product/lifecycle/reliability docs were checked.
- [ ] Relevant reference screen was used for composition/journey intent, not blindly copied.

## Branding

- [ ] User-visible product branding says DigiStream.
- [ ] No stale visible Echoo brand remains in header, auth, landing, footer or system states.
- [ ] Internal legacy class/file names do not leak into visible copy.

## Typography

- [ ] Ordinary UI uses the modern sans-serif contract.
- [ ] Buttons/nav/forms/marketing/footer are not monospace/typewriter by default.
- [ ] Mono is used only for genuinely technical metadata/diagnostics.
- [ ] Mobile hero heading is controlled and does not consume nearly the whole first viewport.
- [ ] Application headings are smaller than marketing hero type.
- [ ] Paragraph line length and line-height remain readable.

## DigiStream identity

- [ ] Warm cream dotted canvas remains recognizable on normal application shells.
- [ ] White/warm-white operational surfaces provide clean contrast.
- [ ] Dusty pink remains the principal brand accent.
- [ ] Supporting lavender/sky/mint/amber/peach tints are restrained.
- [ ] Supporting tints are not being used as fake lifecycle semantics.
- [ ] The result is not generic gray/blue SaaS.
- [ ] The result is not an all-cream/all-pink poster/card stack.

## Structure and Beautiful UI adaptation

- [ ] Repeated comparable records use rows/tables where appropriate.
- [ ] Giant wrapper cards are not used by default.
- [ ] Sidebar/navigation is compact and scannable where applicable.
- [ ] Task/readiness states use compact task patterns.
- [ ] Search/filter/loading/approval/chat/context/insight patterns are used only where real responsibilities support them.
- [ ] No AI Thinking/model/prompt/reasoning UI was introduced without an explicit AI product feature.
- [ ] One contextual primary action is visually dominant for the current state.

## Geometry/elevation

- [ ] Normal controls/panels use restrained 6–10px radius.
- [ ] The UI is not square-everywhere.
- [ ] The UI is not 20–28px rounded-everywhere.
- [ ] Rows/tables rely on borders/dividers rather than repeated shadow.
- [ ] Hard-offset shadow is rare and intentional, not application-wide.

## Shared components

- [ ] Existing design-system primitives were searched before adding new ones.
- [ ] Shared ownership exists for repeated patterns rather than feature-local duplicates.
- [ ] Generic design-system components do not own lifecycle/authorization/media truth.
- [ ] The change does not create duplicate Studio/Broadcasts/Recordings/Lobby/auth/onboarding flows.

## Creator surfaces

- [ ] Overview answers what is happening, what is next and what action matters.
- [ ] Overview is not a KPI/card gallery.
- [ ] Broadcasts uses lifecycle-aware rows/table/filters where appropriate.
- [ ] Recordings uses record-oriented rows and truthful readiness.
- [ ] Studio separates microphone, private contribution and public delivery truth.
- [ ] Studio Lobby/Backstage/Guests/Chat use compact human-communication hierarchy.
- [ ] Analytics is trustworthy or honestly hidden/unavailable.
- [ ] Account/settings/admin use structured rows/tables and explicit confirmations.

## Landing page

- [ ] Header is compact on mobile.
- [ ] Hero headline is controlled (roughly 42–48px mobile unless a deliberate tested exception exists).
- [ ] Hero contains concise copy and clear primary/secondary CTA.
- [ ] Capabilities are compact rows/tiles rather than four giant stacked cards.
- [ ] Three-step journey uses compact steps rather than tall poster cards.
- [ ] Supporting sections are meaningful rather than filler.
- [ ] There is one clear final CTA.
- [ ] Footer is grouped, aligned and responsive.
- [ ] Footer brand says DigiStream.
- [ ] Product/Company/Legal links do not float randomly on mobile.

## System/offline/error states

- [ ] Connectivity-banner actions remain horizontal/readable and do not wrap into vertical letters.
- [ ] Mobile banner stacks deliberately when needed.
- [ ] Blocking states use compact centered content unless the whole route truly cannot render.
- [ ] Error/recovery copy is concise and one recovery action is obvious.

## Product truth

- [ ] No fake listener count/analytics/health/progress/duration/recording/replay state exists.
- [ ] Scheduled content does not look live.
- [ ] Microphone readiness is not public-delivery readiness.
- [ ] Completed broadcast is not automatically recording-ready.
- [ ] Permission state remains server-backed.

## Responsive/accessibility

- [ ] ~360px Android portrait is usable.
- [ ] 390–430px phone portrait is usable.
- [ ] Short-height landscape is usable where applicable.
- [ ] Desktop Chromium is usable.
- [ ] Android desktop-site simulation passes where required.
- [ ] 200% zoom-equivalent acceptance passes where required.
- [ ] No ordinary horizontal overflow exists.
- [ ] Touch targets are practical.
- [ ] Focus-visible is obvious.
- [ ] Keyboard/touch/mouse behavior is complete.
- [ ] Dialog/sheet focus and Back/Escape behavior are correct.
- [ ] Virtual keyboard does not hide active input/composer/critical action.
- [ ] Reduced motion remains functional.

## Tests and implementation discipline

- [ ] No broad blind regex/perl/sed visual rewrite was used across unrelated files.
- [ ] Typecheck passes.
- [ ] Relevant unit/API tests pass.
- [ ] Production build passes.
- [ ] Responsive Playwright passes for affected areas.
- [ ] Node 22/24 validation passes where required.
- [ ] Tests were not weakened merely to hide a regression.
- [ ] Documentation matches the final implementation.

If any material applicable item is NO, the UI slice is not complete.
