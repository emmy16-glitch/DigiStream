# DigiStream Approved 50-Screen Reference Index

Status: **authoritative visual reference inventory**

The approved final DigiStream redesign contains 50 distinct reference screens. These images define composition, hierarchy, density, spacing, typography character, component geometry, color language, and overall visual identity.

They are not evidence that every sample metric, person, date, role, recording, replay, health value, or capability exists in production. Product state must remain API-backed and truthful.

## Mandatory use

For UI implementation, use the references together with:

1. `DIGISTREAM_UI_CONSTITUTION.md` — visual system and reusable rules;
2. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md` — Codex/Claude implementation behavior;
3. `DESIGN_TOKENS.md` — normalized production tokens;
4. root product/lifecycle/quality documents — authoritative product truth;
5. the existing implementation — responsibilities that should be realigned rather than duplicated.

## Visual identity represented by all references

- cream dotted background;
- dusty pink accents;
- bold near-black grotesk headings;
- readable product text with mono/typewriter technical metadata;
- restrained-radius cards and controls;
- thin soft borders with strong focus/emphasis boundaries;
- restrained operational elevation;
- restrained supporting tints and truthful semantic colors;
- task-efficient spacing;
- no legacy blue/white visual system.

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

The expected repository location for the image files is:

```text
docs/design/reference/screens/
```

## How to interpret screenshots

Screenshots are strongest at:

- overall composition;
- visual hierarchy;
- brand personality;
- spacing rhythm;
- component shape;
- typography contrast;
- density/grouping;
- relative action importance.

Screenshots are not authoritative for:

- whether a sample metric exists;
- exact sample dates or names;
- authorization;
- role permissions;
- lifecycle transitions;
- provider/backend architecture;
- whether a feature is currently production-ready.

## Conflict rule

If a screenshot conflicts with backend truth, authorization, privacy, lifecycle, media readiness, accessibility, or established component responsibility, preserve product truth and implement the screenshot's visual intent using the UI Constitution.

Do not solve a conflict by inventing data or creating a duplicate flow.

## Required review questions

Before merging a UI screen based on these references, confirm:

1. Was the exact numbered reference opened and compared at the target viewport?
2. Does the screen preserve the cream-dotted/pink/ink identity with clean operational surfaces and restrained elevation?
3. Is every displayed value real or intentionally omitted/unavailable?
4. Are loading, empty, error, disconnected and unauthorized states covered?
5. Is the correct Public, Listener, or Creator shell used?
6. Does it remain usable on compact mobile, short-height landscape, tablet, and desktop where applicable?
7. Can actions be completed with keyboard, touch, and mouse where supported?
8. Are focus states and accessible labels present?
9. Does status meaning survive without color?
10. Was an existing surface/component realigned instead of unnecessarily duplicated?
11. Is any visual deviation documented explicitly?
12. Would the screen still look recognizably DigiStream if the logo were removed?
