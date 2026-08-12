# DigiStream Approved 50-Screen Reference Index

Status: **authoritative screen/journey reference inventory, subordinate to the current reusable UI V2 system**

The 50-screen pack remains important for:

- screen responsibility;
- product journey;
- information grouping;
- relative hierarchy;
- examples of what belongs together.

It is **not** sole reusable visual authority.

For current reusable styling, typography, branding, landing/footer composition, component density, navigation, rows/tables, radius, elevation and Beautiful UI adaptation, follow:

1. `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`;
2. `DIGISTREAM_UI_CONSTITUTION.md`;
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. `DESIGN_TOKENS.md`;
5. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`.

Product/backend truth always controls authorization, lifecycle, media readiness, privacy, accessibility and real data.

## Current interpretation of the references

When translating a reference into production:

- keep the warm cream dotted DigiStream canvas;
- keep dusty pink as the principal brand accent;
- use clean white/warm-white/neutral operational surfaces;
- use modern sans-serif ordinary UI;
- reserve mono for genuinely technical metadata/diagnostics;
- adapt Beautiful UI-quality compact navigation, rows/tables, search, task, loading, approval, chat, context and insight patterns;
- use restrained lavender/sky/mint/amber/peach supporting tints;
- keep semantic state colours truthful and separate;
- prefer rows/tables for repeated comparable records;
- use restrained 6–10px ordinary radius;
- avoid repeated heavy shadow;
- user-visible branding is DigiStream;
- do not blindly reproduce giant cards, poster-scale mobile headings, awkward footer composition or stale Echoo branding shown by any older implementation/reference interpretation.

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

## References are strongest at

- purpose of the screen;
- overall information hierarchy;
- content grouping;
- relative action importance;
- journey continuity;
- likely state/context relationships;
- brand personality compatible with the current system.

## References are not authoritative for

- sample metric existence;
- exact sample dates/names;
- authorization/permissions;
- lifecycle transitions;
- backend/provider architecture;
- production feature readiness;
- exact reusable token values;
- ordinary font family rules;
- forcing monospace buttons/labels;
- forcing square geometry;
- forcing hard shadow;
- forcing giant repeated cards;
- forcing stale Echoo branding;
- forcing an awkward landing/footer layout that conflicts with the current complete specification.

## Conflict rule

If a screenshot conflicts with product truth, preserve product truth.

If it conflicts with reusable UI V2 rules, preserve the screenshot's **content/journey intent** while implementing it using the current complete specification and shared design system.

Do not invent data or duplicate flows to make a reference appear exact.
