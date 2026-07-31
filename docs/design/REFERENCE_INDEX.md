# DigiStream Approved Screen Reference Index

The images in `docs/design/reference/` are the approved visual direction for DigiStream as of 31 July 2026.

They are reference designs rather than evidence that all displayed data and capabilities exist. Sample organisations, dates, people, metrics, verification marks, subscription plans and health values are illustrative.

## Screen map

| # | File | Surface | Primary purpose |
|---|---|---|---|
| 01 | `01-guest-waiting-room.png` | Guest | Invitation acceptance, microphone readiness and host admission |
| 02 | `02-public-live-player.png` | Listener | Immersive live playback, recovery, sharing and request to speak |
| 03 | `03-listener-discovery.png` | Listener | Discover live, upcoming and featured audio |
| 04 | `04-creator-settings.png` | Creator | Workspace, branding, defaults, notifications, roles and security |
| 05 | `05-creator-analytics.png` | Creator | Audience, content and stream-quality analytics |
| 06 | `06-recordings-library.png` | Creator | Recording search, playback, metadata, publishing and retention actions |
| 07 | `07-guests-backstage.png` | Creator | Guest admission, live stage, listener requests and backstage communication |
| 08 | `08-live-broadcast-control.png` | Creator | Active broadcast monitoring, controls, audience and event log |
| 09 | `09-creator-overview.png` | Creator | Operational dashboard and current-broadcast summary |
| 10 | `10-broadcast-studio.png` | Creator | Broadcast configuration, audio check, scheduling and go-live readiness |

## How to use the references

For each implementation, use the screenshots together with:

- `DIGISTREAM_PRODUCT_DESIGN_BIBLE.md` for product behaviour, hierarchy, state and responsive rules;
- `DESIGN_TOKENS.md` for shared visual tokens;
- the existing backend contracts for what data and actions are actually available.

The screenshots are strongest at:

- overall composition;
- navigation hierarchy;
- density and grouping;
- dark visual identity;
- audio-first signals;
- creator/listener distinction;
- operational state transparency.

The screenshots are not authoritative for:

- exact metrics or dates;
- implemented subscriptions or billing;
- enabled 2FA;
- verification badges;
- final role names;
- exact provider architecture language;
- exact colour values before contrast validation;
- mobile layouts, which must be derived from the responsive rules.

## Required review questions

Before merging a screen based on these references, confirm:

1. Is every displayed value supplied by a real API or clearly marked unavailable/illustrative?
2. Does the screen include loading, empty, error, disconnected and unauthorized states?
3. Does it remain usable at compact mobile, tablet and desktop widths?
4. Can all actions be completed with a keyboard?
5. Are focus states and accessible labels present?
6. Does status meaning survive without colour?
7. Are destructive actions protected?
8. Does user-facing copy hide unnecessary provider terminology?
9. Does the layout preserve task priority rather than merely copy desktop geometry?
10. Is visual evidence attached to the pull request?
