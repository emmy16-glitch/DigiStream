# DigiStream Approved 50-Screen Reference Index

Status: **authoritative screen/journey reference inventory, subordinate to the v2.1 reusable UI system**

The DigiStream reference pack contains 50 distinct screens. These images remain important for screen responsibility, product journey, information grouping, relative hierarchy and content intent.

They are **not** the sole reusable visual authority.

For reusable styling, component density, colour layering, navigation, rows/tables, radius, elevation and Beautiful UI adaptation, follow:

1. `DIGISTREAM_UI_CONSTITUTION.md`;
2. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
3. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
4. `DESIGN_TOKENS.md`.

The images are never evidence that sample metrics, people, dates, roles, recordings, replay, health values or capabilities exist in production. Product state remains API-backed and truthful.

## Current visual interpretation

When translating these references into production:

- **keep the warm cream dotted DigiStream application canvas**;
- keep dusty pink as the main brand anchor;
- use clean white/warm-white/neutral operational surfaces inside that canvas;
- borrow Beautiful UI-style compact density and component hierarchy;
- use restrained lavender/sky/mint/amber/peach supporting tints where useful;
- keep live/success/warning/danger/info semantic colours separate and truthful;
- prefer rows/tables for repeated comparable records;
- reduce heavy nested shadows;
- use restrained radius rather than forcing every component square or every component extremely rounded;
- preserve product hierarchy without recreating oversized decorative cards blindly.

The correct goal is **DigiStream + Beautiful UI-quality interface grammar**, not a literal screenshot reconstruction.

## Screen map

| # | File | Surface / purpose |
|---:|---|---|
| 01 | `01_creator_overview.png` | Creator overview dashboard |
| 02 | `02_broadcasts.png` | Creator broadcasts management |
| 03 | `03_studio_lobby.png` | Pre-live Studio Lobby and readiness |
| 04 | `04_live_chat.png` | Creator live chat / moderation |
| 05 | `05_public_landing.png` | Public DigiStream landing page |
| 06 | `06_login.png` | Sign-in flow |
| 07 | `07_signup_choice.png` | Account creation method choice |
| 08 | `08_signup_form.png` | Full account creation form |
| 09 | `09_creator_intent.png` | Creator/listener intent selection |
| 10 | `10_create_organisation.png` | Creator onboarding — organisation |
| 11 | `11_create_channel.png` | Creator onboarding — channel |
| 12 | `12_create_broadcast.png` | Creator onboarding — first broadcast |
| 13 | `13_listener_discover.png` | Listener discovery |
| 14 | `14_replay_library.png` | Replay library |
| 15 | `15_replay_player.png` | Replay playback |
| 16 | `16_live_listener.png` | Live listener player |
| 17 | `17_guest_join.png` | Guest join flow |
| 18 | `18_admin_users.png` | Admin users |
| 19 | `19_my_library.png` | Listener personal library |
| 20 | `20_public_channel.png` | Public channel profile |
| 21 | `21_profile_settings.png` | Profile settings |
| 22 | `22_active_sessions.png` | Security / active sessions |
| 23 | `23_notifications.png` | Notification preferences |
| 24 | `24_organisation_settings.png` | Organisation settings |
| 25 | `25_team_invitations.png` | Team members and invitations |
| 26 | `26_accept_invitation.png` | Invitation acceptance |
| 27 | `27_channel_settings.png` | Channel settings |
| 28 | `28_forgot_password.png` | Forgot-password flow |
| 29 | `29_reset_password.png` | Password reset |
| 30 | `30_verify_email.png` | Email verification |
| 31 | `31_public_creator_profile.png` | Public creator profile |
| 32 | `32_account_workspace_menu.png` | Account/workspace switcher |
| 33 | `33_end_broadcast_confirmation.png` | End-broadcast confirmation |
| 34 | `34_admin_suspend_confirmation.png` | Admin suspend confirmation |
| 35 | `35_backstage_creator_dashboard.png` | Backstage creator operations |
| 36 | `36_broadcast_studio_dashboard.png` | Broadcast Studio operational dashboard |
| 37 | `37_recordings_dashboard.png` | Recordings workspace |
| 38 | `38_mobile_analytics_dashboard.png` | Mobile analytics |
| 39 | `39_studio_reconnecting_live_dashboard.png` | Studio reconnecting/recovery state |
| 40 | `40_faith_broadcast_countdown.png` | Scheduled broadcast countdown |
| 41 | `41_request_to_speak_interface.png` | Listener request-to-speak interaction |
| 42 | `42_live_listening_dashboard.png` | Live listening dashboard |
| 43 | `43_live_broadcasts_app_interface.png` | Live broadcasts browsing |
| 44 | `44_about_page_ui.png` | About / product information page |
| 45 | `45_sign_in_listening_prompt.png` | Listener sign-in prompt |
| 46 | `46_welcome_back_sign_in_screen.png` | Returning listener sign-in |
| 47 | `47_live_audio_dashboard.png` | Live audio listener dashboard |
| 48 | `48_live_audio_discovery_app.png` | Live audio discovery application |
| 49 | `49_creator_workspace_stats_dashboard.png` | Creator workspace statistics |
| 50 | `50_creator_analytics_dashboard.png` | Creator analytics dashboard |

Expected repository location:

```text
docs/design/reference/screens/
```

## What screenshots are strongest at

Use them to understand:

- what the screen is for;
- overall information hierarchy;
- content grouping;
- relative action importance;
- user journey continuity;
- likely state/context relationships;
- brand personality that does not conflict with the current Constitution.

## What screenshots are not authoritative for

- sample metric existence;
- exact sample dates/names;
- authorization;
- role permissions;
- lifecycle transitions;
- provider/backend architecture;
- production feature readiness;
- whether a capability exists;
- exact reusable token value;
- forcing square geometry on every current component;
- forcing hard offset shadows on every current component;
- forcing every inner surface to remain cream/pink instead of using the current white/neutral Beautiful UI hybrid.

## Conflict rule

If a screenshot conflicts with backend truth, authorization, privacy, lifecycle, media readiness, accessibility or established component responsibility, preserve product truth.

If a screenshot conflicts with reusable v2.1 UI-system rules, preserve the screenshot's **content/journey intent** while implementing it with the current Constitution and Beautiful UI adaptation standard.

Do not resolve conflict by inventing data or duplicating a flow.

## Required review questions

Before merging a UI change based on these references, confirm:

1. Was the relevant numbered reference opened for product composition/journey intent?
2. Was `BEAUTIFUL_UI_ADAPTATION_STANDARD.md` followed for the adapted component pattern?
3. Is the cream dotted DigiStream shell still recognizable where appropriate?
4. Are white/neutral inner surfaces used where they improve density and readability?
5. Is dusty pink still the principal brand accent?
6. Are supporting accent colours restrained and intentionally mapped?
7. Are semantic state colours truthful and separate from decorative accents?
8. Is every displayed value real or intentionally unavailable/omitted?
9. Are loading, empty, error, disconnected and unauthorized states covered?
10. Is the correct Public, Listener or Creator responsibility reused rather than duplicated?
11. Does the layout work on compact mobile, short-height landscape and desktop where applicable?
12. Are keyboard, touch, focus and Back/Escape behaviors correct?
13. Are repeated records rows/tables when comparison matters?
14. Is there one clear contextual primary action?
15. Is any deliberate deviation documented?
16. Would the screen still feel like DigiStream if the logo were removed?
