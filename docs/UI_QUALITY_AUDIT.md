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
| UIQ-007 | P1 | Cross-product responsive audit | Existing responsive smoke tests did not exercise the complete agreed 1440×900, 1280×720, 768×1024, 390×844, 360×800 and 844×390 matrix. The first audited slice also found a hidden-clipping defect in the landing hero at 844×390 and stale `backstage` product copy. | In progress — slice 1 | Landing/auth/creator-intent now have an exact six-viewport browser matrix that checks page and internal overflow plus 44px primary targets; 844×390 landing columns are bounded instead of clipped and live copy uses Studio Lobby. Slice 1 requires CI; onboarding, creator core/secondary, listener, guest/system and global-overlay slices remain open. |
| UIQ-008 | P2 | Motion/polish | Fine motion, hierarchy and microinteraction polish must follow real-state, reduced-motion and low-end Android rules rather than decorative animation. | Open | Use `emil-design-eng` after structural P0/P1 defects are resolved. |
| UIQ-009 | P1 | Overview → Studio Lobby | The Overview knew the exact authorised channel/broadcast context but opening Studio Lobby relied on a generic strongest-broadcast heuristic, causing unnecessary re-selection or the wrong initial context. | Fixed in contextual-entry PR | One-shot requested context reorders only real authorised API responses; stale/terminal/cross-tenant resources cannot be promoted; generic navigation keeps existing fallback. |

## UIQ-007 responsive audit coverage

The required matrix is **1440×900, 1280×720, 768×1024, 390×844, 360×800 and 844×390**. Each bounded slice records actual defects before correction rather than treating a screenshot or a no-horizontal-overflow assertion as complete responsive acceptance.

- **Slice 1 — Landing, authentication and creator intent:** implementation complete on the entry-responsive branch, CI pending. Includes an internal-overflow assertion so `overflow: hidden` cannot conceal clipped landing content, primary touch-target checks and Studio Lobby terminology on the live landing feature card.
- **Slice 2 — Organisation/channel/broadcast onboarding:** pending.
- **Slice 3 — Creator shell, Overview, Broadcasts and Studio:** pending.
- **Slice 4 — Chat, Studio Lobby and Recordings:** pending.
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
