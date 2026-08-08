# DigiStream UI quality audit

This register tracks concrete UI defects found against current executable code, the approved Echoo references, DigiStream product rules, responsive acceptance and the installed design-agent playbooks. A design suggestion is not a defect unless the current implementation or reference evidence supports it.

Severity:

- **P0** — broken interaction, inaccessible presentation, hidden/unreachable control, overflow or materially misleading state.
- **P1** — confusing hierarchy, inconsistent product flow, excessive task friction or meaningful responsive inefficiency.
- **P2** — visual refinement, cleanup or low-risk polish after P0/P1 issues are controlled.

Verification labels distinguish automated evidence from physical-device or manual visual acceptance. Passing CI alone does not prove every visual condition.

| ID | Severity | Surface | Finding | Status | Evidence / next gate |
| --- | --- | --- | --- | --- | --- |
| UIQ-001 | P0 | Creator organisation setup | Inline validation used pale dark-theme danger text on the Echoo light danger surface, reducing legibility. | Fixed in foundation PR | Shared semantic foreground + automated WCAG AA contrast test; responsive CI passed. |
| UIQ-002 | P0 | Shared state panels | Error/offline, unauthorized and loading icons inherited pale dark-theme foregrounds on light semantic surfaces. | Fixed in foundation PR | Shared semantic foregrounds + automated WCAG AA contrast test; responsive CI passed. |
| UIQ-003 | P0 | Broadcast overdue state | The late manual-review override used pale yellow text on a light warning surface and `!important`, defeating the light design system. | Fixed in foundation PR | Late semantic normalization + automated WCAG AA contrast test; responsive CI passed. |
| UIQ-004 | P1 | Shared legacy CSS | `styles.css` retained retired dark/green compatibility selectors (`workspace-welcome`, `signal-visual`, `level-meter`) after their original surfaces were replaced. | Fixed in legacy CSS ownership PR | Removed only selectors with no executable web owner; recursive source regression proves they stay retired, while the live Studio meter remains owned by `StudioAudioMeter` + `studio-audio-meter.css`; responsive CI passed. |
| UIQ-005 | P1 | Creator workspace context | `CreatorDashboard` treated API list position as the implicit primary organisation, so multi-organisation creators could land in the wrong workspace with no understandable switcher. | Fixed in workspace-context PR | Explicit saved selection is revalidated against the authorised organisation API, then personal workspace and newest authorised workspace are safe fallbacks; desktop/mobile switchers reset stale Overview data and request generations prevent late responses from restoring the previous organisation; exact-main Node 22/24, responsive Playwright and infrastructure CI passed. |
| UIQ-006 | P1 | Product terminology docs | Older hardening documentation used creator-facing `Backstage` wording and still described a retired dark visual identity, contradicting the current Studio Lobby vocabulary and Echoo light system. | Fixed in terminology-docs PR | Hardening guidance now uses Studio Lobby in creator-facing prose, explicitly preserves internal compatibility identifiers, aligns the current Echoo light identity, and adds a regression contract preventing stale terminology/identity wording from returning; exact-main Node 22/24, responsive Playwright and infrastructure CI passed. |
| UIQ-007 | P1 | Cross-product responsive audit | Existing responsive smoke tests did not exercise the complete agreed 1440×900, 1280×720, 768×1024, 390×844, 360×800 and 844×390 matrix. Entry and onboarding slices found real clipping, guidance and focus defects; Creator-core found undersized shell/Studio controls; Chat then exposed undersized history/composer controls and a legacy low-contrast error foreground. | In progress — slice 4 | Slices 1–3 are merged. Slice 4 normalizes the Chat interaction floor/error semantics and adds the exact matrix across Chat, Studio Lobby and Recordings using real authorised organisation/channel/scheduled-broadcast state. Slice 4 still requires exact-head CI, review, merge and exact-current-main push CI. |
| UIQ-008 | P2 | Motion/polish | Fine motion, hierarchy and microinteraction polish must follow real-state, reduced-motion and low-end Android rules rather than decorative animation. | Open | Use `emil-design-eng` after structural P0/P1 defects are resolved. |
| UIQ-009 | P1 | Overview → Studio Lobby | The Overview knew the exact authorised channel/broadcast context but opening Studio Lobby relied on a generic strongest-broadcast heuristic, causing unnecessary re-selection or the wrong initial context. | Fixed in contextual-entry PR | One-shot requested context reorders only real authorised API responses; stale/terminal/cross-tenant resources cannot be promoted; generic navigation keeps existing fallback. |

## UIQ-007 responsive audit coverage

The required matrix is **1440×900, 1280×720, 768×1024, 390×844, 360×800 and 844×390**. Each bounded slice records actual defects before correction rather than treating a screenshot or a no-horizontal-overflow assertion as complete responsive acceptance.

- **Slice 1 — Landing, authentication and creator intent:** complete and merged. The exact matrix covers page/internal overflow and primary touch-target size; 844×390 landing columns are bounded instead of clipped, entry controls meet the 44px floor and live landing copy uses Studio Lobby. The change remains in current `main` ancestry and exact-current-main CI is green.
- **Slice 2 — Organisation/channel/broadcast onboarding:** complete and merged. Step 1 keeps truthful Echoo public-slug guidance, the first onboarding heading owns entry focus, automatic first-channel/first-broadcast focus is target-specific to successful step progression, browser Back retains Creator shell focus ownership, and the exact matrix covers long content and 44px controls through the scheduling form. Exact-current-main Node 22/24, responsive Playwright and infrastructure CI are green.
- **Slice 3 — Creator shell, Overview, Broadcasts and Studio:** complete and merged in PR #169. The Creator home brand link and workspace selector meet the 44px interaction floor; Studio diagnostic disclosure controls are at least 44px; the exact matrix uses real authorised multi-workspace, active-channel and draft-broadcast state and verifies shell, Overview, Broadcasts and Studio without claiming LiveKit readiness.
- **Slice 4 — Chat, Studio Lobby and Recordings:** in progress. Chat history/composer/login controls are normalized to the 44px floor, the legacy pale error foreground is replaced with the semantic danger system, and a dedicated exact-matrix browser test uses real authorised organisation/channel/scheduled-broadcast state to verify Chat selection, Studio Lobby dialog bounds/controls and Recordings state without fabricating media or recording evidence.
- **Slice 5 — Listener discovery/live/request-to-speak/replay:** pending.
- **Slice 6 — Guest Join, system states and global overlays/modals:** pending.

Existing Android Chrome and Android desktop-site smoke projects remain complementary device-specific evidence; they do not replace the exact matrix above.

## Design-skill usage for this programme

- **UI UX Pro Max**: structural UX, responsive hierarchy, accessibility and design-system checks.
- **Impeccable**: broad product-UI critique and final refinement passes.
- **Emil Kowalski `emil-design-eng`**: interaction feedback, component craft and evidence-backed motion decisions after structural correctness.
- **Taste Skill**: only for surfaces within its pinned upstream scope, such as landing/auth-entry presentation. It is not used as authority for dashboards, data tables, Studio or multi-step product UI.

## Non-negotiable truth boundary

No UI correction may invent analytics, listener counts, readiness, lifecycle state, recording/replay availability, permissions, media evidence or success. Existing APIs, authorization, tenant isolation, lifecycle services, current responsible components and approved Echoo references remain authoritative.