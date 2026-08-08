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
| UIQ-003 | P0 | Broadcast overdue state | The late manual-review override used pale yellow text on a light warning surface and `!important`, defeating the light design system. | Fixed in foundation PR | Late semantic normalization + automated contract; responsive CI passed. |
| UIQ-004 | P1 | Shared legacy CSS | `styles.css` still contains older dark/green compatibility selectors such as `workspace-welcome`, `signal-visual` and `level-meter`. Their live ownership must be proven before removal or migration. | Open | Search route/component ownership, then remove dead CSS or migrate live selectors without changing truthful media meaning. |
| UIQ-005 | P1 | Creator workspace context | `CreatorDashboard` still treats the first organisation as the implicit primary context. This is a product-flow issue, not a cosmetic one. | Open | Handle in the authoritative workspace-projection workstream with API-backed selection and refresh tests. |
| UIQ-006 | P1 | Product terminology docs | Older hardening documentation still contains creator-facing `Backstage` wording even though the current product surface is Studio Lobby. | Open | Reconcile documentation without renaming internal compatibility APIs/types unnecessarily. |
| UIQ-007 | P1 | Cross-product responsive audit | Existing Playwright proves key responsive workflows, but the complete screen-by-screen 360/390/tablet/desktop/short-landscape visual audit is not yet recorded in this register. | Open | Execute per-surface audit in bounded PRs and record each resolved defect. |
| UIQ-008 | P2 | Motion/polish | Fine motion, hierarchy and microinteraction polish must follow real-state, reduced-motion and low-end Android rules rather than decorative animation. | Open | Use `emil-design-eng` after structural P0/P1 defects are resolved. |
| UIQ-009 | P1 | Overview → Studio Lobby | The Overview knew the exact authorised channel/broadcast context but opening Studio Lobby relied on a generic strongest-broadcast heuristic, causing unnecessary re-selection or the wrong initial context. | Fixed in contextual-entry PR | One-shot requested context reorders only real authorised API responses; stale/terminal/cross-tenant resources cannot be promoted; generic navigation keeps existing fallback. |

## Design-skill usage for this programme

- **UI UX Pro Max**: structural UX, responsive hierarchy, accessibility and design-system checks.
- **Impeccable**: broad product-UI critique and final refinement passes.
- **Emil Kowalski `emil-design-eng`**: interaction feedback, component craft and evidence-backed motion decisions after structural correctness.
- **Taste Skill**: only for surfaces within its pinned upstream scope, such as landing/auth-entry presentation. It is not used as authority for dashboards, data tables, Studio or multi-step product UI.

## Non-negotiable truth boundary

No UI correction may invent analytics, listener counts, readiness, lifecycle state, recording/replay availability, permissions, media evidence or success. Existing APIs, authorization, tenant isolation, lifecycle services, current responsible components and approved Echoo references remain authoritative.
