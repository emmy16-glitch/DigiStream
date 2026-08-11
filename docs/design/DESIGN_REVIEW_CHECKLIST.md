# DigiStream Design Review Checklist

Use this checklist for human review and AI-agent self-review before merging UI work.

## Brand language

- [ ] Cream dotted canvas is present where expected.
- [ ] Dusty pink is the primary brand accent.
- [ ] No legacy brand-blue UI has returned.
- [ ] No previous dark/emerald application theme has returned except intentional dark media artwork.
- [ ] Near-black ink provides the main contrast.
- [ ] Large headings use the heavy grotesk voice.
- [ ] Mono is reserved for technical metadata, timestamps, identifiers and diagnostics.
- [ ] Operational cards and controls use the shared restrained radius scale.
- [ ] Rows and tables avoid unnecessary shadow; stronger elevation is reserved for overlays or rare brand emphasis.
- [ ] White/warm-white operational surfaces remain visually distinct from the cream dotted canvas.
- [ ] Supporting lavender/sky/mint/amber/peach tints are restrained and never imply lifecycle state.

## Structure

- [ ] The implemented page was compared with its numbered reference.
- [ ] Screen hierarchy matches the reference intent.
- [ ] Major spacing feels deliberate rather than cramped.
- [ ] Dense screens use compact rows/tables, dividers and progressive disclosure rather than nested cards.
- [ ] Reusable patterns are shared components, not one-off copies.
- [ ] The change does not create a duplicate screen or parallel product flow.

## Product truth

- [ ] No screenshot placeholder is masquerading as real data.
- [ ] Statuses are backed by real lifecycle state.
- [ ] Permissions are enforced by real product rules.
- [ ] Replay/recording/analytics actions appear only when real data exists.
- [ ] Scheduled content does not look live.
- [ ] Readiness claims are evidence-backed.
- [ ] Missing measurements are omitted or described honestly rather than shown as fake zeroes.

## Navigation

- [ ] Correct Public, Listener, or Creator shell is used.
- [ ] Primary navigation vocabulary is stable.
- [ ] Contextual actions do not duplicate primary navigation.
- [ ] Existing routes/components are reused rather than forked unnecessarily.

## Accessibility and responsiveness

- [ ] 44px touch targets are maintained.
- [ ] Focus-visible is obvious.
- [ ] Color is not the only state signal.
- [ ] Small Android portrait is usable.
- [ ] Desktop is usable without over-expanding content.
- [ ] Short-height landscape remains operable.
- [ ] Long text does not cause horizontal overflow.
- [ ] Dialog/sheet focus and Back/Escape behavior are correct.
- [ ] Reduced motion remains usable.
- [ ] Loading and disabled states remain understandable.

## Final identity question

- [ ] If the DigiStream logo were removed, would this screen still clearly belong to the approved DigiStream system?

If the answer to the final question is no, do not merge the screen as visually complete.
