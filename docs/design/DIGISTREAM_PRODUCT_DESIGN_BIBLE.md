# DigiStream Product Design Bible

Status: **authoritative visual and interaction direction**

This document preserves the full DigiStream product design represented by the approved reference screens. It is the design source of truth for creator, listener, guest, recording, analytics and settings experiences.

The reference screens define a production-quality direction, not proof that every represented capability is already implemented. Product screens must use real backend states and must never display invented metrics, fake health, fake listener counts or unavailable controls in production.

## 1. Product identity

DigiStream is an audio-first live broadcasting platform for creators, churches, organisations and communities.

The experience should feel:

- professional without feeling corporate or cold;
- technically trustworthy without overwhelming non-technical users;
- calm during long live sessions;
- audio-first rather than video-first;
- consistent across creator, guest and listener surfaces;
- usable on phones as a first-class target, not a reduced desktop port.

Primary promise:

> Professional live audio for creators, churches and communities.

Supporting ideas:

- Live audio without heavy video.
- Real voices, real time, real connection.
- Clear contribution, delivery and listener-state transparency.

## 2. Core visual language

### 2.1 Theme

- Near-black application canvas.
- Slightly lighter elevated panels and cards.
- Fine neutral borders instead of heavy shadows.
- Emerald green as the primary action and healthy-state accent.
- White or near-white primary text.
- Muted cool-gray secondary text.
- Red reserved for destructive actions, active live elapsed indicators and critical failure.
- Amber reserved for waiting, warning and degraded states.
- Blue may identify informational or draft states.

The interface should remain dark by default. Light mode may be introduced later, but it must be token-driven rather than implemented through component-specific overrides.

### 2.2 Shape and depth

- Cards use restrained rounded corners.
- Nested panels must remain visually distinguishable through tone and borders.
- Avoid excessive glassmorphism, blur and glow.
- Green glow may be used sparingly around live audio or primary actions.
- Critical controls need strong shape and spacing, not only colour.

### 2.3 Audio-first visual signals

Reusable audio signals include:

- waveform timelines;
- segmented microphone input meters;
- pulsing live dots;
- connection-quality indicators;
- microphone and headphones icons;
- listener and participant counts;
- elapsed and remaining time labels.

Waveforms must communicate a real purpose. Use a detailed waveform when it supports monitoring, seeking, chaptering or clipping. Use a simpler progress treatment when the waveform would be decorative only.

## 3. Product information architecture

### 3.1 Public listener surface

Primary navigation should converge on:

- Discover
- Live Now
- Categories
- Search
- Sign in / account

Avoid presenting `Listen` and `Browse` as competing top-level destinations unless their behavioural difference is clear. The preferred early structure is one discovery feed with filters for live, upcoming, category and following.

### 3.2 Creator workspace

Primary navigation:

- Overview
- Broadcasts
- Audience
- Recordings
- Analytics
- Settings

The creator workspace uses a persistent desktop sidebar, a tablet drawer or compact rail, and a mobile bottom navigation or drawer depending on task complexity.

### 3.3 Guest surface

The guest journey is intentionally separate and focused:

1. invitation accepted;
2. microphone setup;
3. waiting for host;
4. admitted to stage;
5. live or backstage participation;
6. removed, ended or expired state.

The guest should never see unrelated creator workspace navigation.

## 4. Authoritative screen inventory

### 4.1 Guest waiting room

Purpose: reduce guest anxiety and make admission state obvious.

Required regions:

- DigiStream identity and help access;
- broadcast and organisation identity;
- microphone selector;
- real-time input meter and dB feedback;
- mute control;
- headphone guidance;
- invitation/admission timeline;
- invitation details;
- secure-and-private reassurance.

Behavioural rules:

- the current timeline step uses the standard active/pulsing state;
- completed steps use a check icon;
- waiting must not imply the guest is already audible publicly;
- expired, revoked, rejected, disconnected and admission-timeout states require dedicated designs;
- mobile layout prioritises microphone readiness and current admission state.

### 4.2 Public live broadcast player

Purpose: provide an immersive, reliable listener experience.

Required regions:

- broadcast artwork and metadata;
- live state and elapsed time;
- WebRTC-first player with LL-HLS fallback;
- play/pause, volume and recovery controls;
- connection status written in plain language;
- request-to-speak entry point when enabled;
- live chat when enabled and authenticated;
- broadcast description and organisation links;
- upcoming and related broadcasts.

Rules:

- listeners should not see creator diagnostics;
- automatic fallback must be explained without exposing unnecessary provider internals;
- share action may include copy link, WhatsApp, Telegram, email and QR code;
- avoid a second competing copy-link action beside the main share control;
- unavailable, ended, cancelled, private, buffering, offline and reconnecting states are mandatory.

### 4.3 Discover / listener home

Purpose: help users find live and upcoming audio quickly.

Required regions:

- audio-first hero;
- search;
- category filters;
- sort or status filter;
- live-now cards;
- upcoming broadcasts;
- featured channels or organisations;
- sign-in state.

Rules:

- `All Categories` is the default filter state, not a competing category chip;
- cards display only real values;
- listener counts, verification and scheduling data must come from real APIs;
- zero-results and no-live-broadcast states need designed empty states;
- mobile discovery uses a single-column or horizontally scrollable card system with clear tap targets.

### 4.4 Creator overview

Purpose: give the creator a clear operational summary and fast access to the next action.

Required regions:

- greeting and workspace identity;
- primary create/start broadcast action;
- current broadcast summary;
- creator studio audio status;
- audience summary;
- guests and backstage summary;
- listener preview;
- quick actions;
- recent recordings;
- bounded analytics summary.

Rules:

- listener preview should support an expanded exact listener view, including mobile preview;
- primary operational action must dominate;
- no fake analytics or health values;
- new accounts use onboarding and empty-state cards instead of populated sample metrics.

### 4.5 Broadcast studio / pre-live setup

Purpose: configure and verify a broadcast before public delivery.

Required regions:

- organisation and channel selection;
- title, description, artwork and visibility;
- start-now or schedule choice;
- microphone selection;
- sound check and level meter;
- monitor volume and state;
- contribution room and delivery readiness;
- stream summary and go-live controls.

Terminology rules:

- replace ambiguous `Monitor` with a precise label such as `Hear studio audio`, `Self-monitor` or `Monitor guests`, depending on actual behaviour;
- distinguish `Start now`, `Schedule` and `Go live` so users understand creation versus public transmission;
- show provider names only inside diagnostics, not as the main user-facing explanation.

Safety rules:

- microphone permission must be confirmed;
- silent input and clipping require explicit guidance;
- public delivery cannot be declared live until contribution and delivery readiness are verified;
- destructive or irreversible actions require confirmation where appropriate.

### 4.6 Live broadcast control

Purpose: operate an active broadcast without losing awareness of audio and audience health.

Required regions:

- broadcast identity and elapsed time;
- live audio monitor;
- microphone and input meter;
- mute and audio-monitor controls;
- end-broadcast control;
- share and clipping actions when supported;
- connection quality;
- listener preview;
- current audience summary;
- stream health;
- recent event log.

Priority order:

1. audio and connection safety;
2. end/mute controls;
3. audience and guest actions;
4. sharing and secondary actions;
5. historical metrics.

Mobile rules:

- primary live controls remain reachable near the bottom;
- accidental end-broadcast taps require a protected confirmation flow;
- listener preview and stream health become tabs, sheets or accordions;
- operational warnings appear above secondary metrics.

### 4.7 Guests and backstage

Purpose: manage invited guests, listener requests and on-stage participants.

Priority order:

1. pending actions summary;
2. people on stage;
3. waiting guests;
4. listener requests;
5. admitted or inactive guests;
6. backstage chat and notes;
7. invitation management.

Required summary example:

> 2 guests waiting · 3 listener requests · 2 people live

Rules:

- waiting rows receive visual emphasis;
- admit, approve and reject actions stay close to the person and reason;
- role, source, status and last state change remain visible;
- live-stage controls are distinct from invitation controls;
- private backstage chat must never be confused with public broadcast chat.

### 4.8 Recordings library and detail

Purpose: manage, preview, publish, share and eventually edit archived audio.

Required regions:

- status filters: all, published, drafts, private and archived;
- search and additional filters;
- stable pagination or cursor navigation;
- selected recording details;
- playback controls;
- waveform when chapters/clips/editing justify it;
- metadata, visibility and quality;
- actions: play, edit metadata, download, share, archive and delete.

Rules:

- deletion is destructive and requires confirmation;
- processing, upload, failure and unavailable states are mandatory;
- private and published states must be clear beyond colour;
- downloads require explicit authorization;
- waveform and chapter markers must represent actual recording data.

### 4.9 Analytics

Purpose: help creators understand audience and stream performance without inventing precision.

Required regions may include:

- total and unique listeners;
- live peak;
- average listen time;
- returning listeners;
- audience growth;
- top broadcasts;
- device distribution;
- location distribution;
- stream quality and health.

Rules:

- define every metric before implementation;
- label estimated, sampled, delayed or incomplete metrics;
- analytics never appear as real until event collection is implemented;
- use progressive disclosure to reduce density;
- primary KPI numbers dominate their cards;
- maps require accessible tabular alternatives;
- mobile uses stacked sections and summary-first views.

### 4.10 Settings

Purpose: manage organisation, branding, defaults, notifications, team roles and security.

Sections:

- workspace;
- channel branding;
- stream defaults;
- notifications;
- team roles;
- security.

Rules:

- show only settings supported by the current backend;
- two-factor authentication must not appear enabled until implemented and verified;
- role labels must map to DigiStream's actual permission model;
- destructive membership/security changes require confirmation and auditability;
- settings forms include saved, saving, failed and unsaved-change states.

## 5. Component system

Core reusable components:

- application shell and responsive navigation;
- brand lockup and waveform mark;
- page header and breadcrumbs;
- card, panel and nested section;
- primary, secondary, ghost, danger and icon buttons;
- status badge with icon, text and colour;
- live indicator and elapsed timer;
- input, select, search and filter controls;
- tabs, segmented controls and chips;
- microphone selector and permission state;
- segmented level meter;
- waveform player and simplified progress player;
- listener/participant avatar row;
- data table and responsive list row;
- metric card and trend treatment;
- empty, loading, error, degraded and offline states;
- confirmation dialog and mobile bottom sheet;
- toast and inline alert;
- realtime connection indicator;
- listener preview frame.

Every component must document:

- default state;
- hover and active state;
- keyboard focus state;
- disabled state;
- loading state;
- error state;
- mobile behaviour;
- screen-reader label where required.

## 6. Status language

Status must never rely on colour alone.

Recommended combinations:

- Healthy / Excellent: green badge + check or signal icon + label.
- Live: pulsing dot or broadcast icon + `Live` label.
- Waiting: amber badge + clock or waiting icon + label.
- Degraded: amber warning icon + explanation.
- Offline / Failed: red icon + direct recovery guidance.
- Draft: neutral or blue badge + label.
- Private: lock icon + label.
- Completed: check or archive icon + label.

Provider-specific statuses such as LiveKit room, Egress and OvenMediaEngine should be translated into user-facing stages:

- Studio connected
- Public delivery preparing
- Live audio ready
- Reconnecting audio
- Public delivery unavailable

Provider details remain available in diagnostics and logs.

## 7. Required non-ideal states

Every primary feature must be designed for:

- initial loading;
- empty account;
- no organisations;
- no channels;
- no broadcasts;
- no listeners;
- no recordings;
- no analytics yet;
- permission denied;
- microphone missing;
- silent microphone;
- clipping input;
- contribution disconnected;
- delivery not ready;
- degraded network;
- browser offline;
- playback buffering;
- automatic fallback;
- authorization required;
- private access denied;
- invitation expired or revoked;
- request rate-limited;
- action conflict or stale version;
- server unavailable;
- completed/cancelled/failed broadcast.

Screens are not complete until these states are represented in design and implementation.

## 8. Responsive system

Breakpoints are implementation tokens, not one-off CSS decisions. Suggested starting points:

- compact/mobile: below 640 px;
- large mobile/small tablet: 640–899 px;
- tablet/small desktop: 900–1199 px;
- desktop: 1200 px and above.

Responsive principles:

- preserve task priority, not desktop geometry;
- collapse sidebars into drawers, rails or bottom navigation;
- convert dense multi-column control areas into tabs, accordions or bottom sheets;
- maintain minimum 44 by 44 px interactive targets;
- keep live-critical controls reachable;
- do not hide warnings behind tabs;
- avoid horizontal page scrolling;
- test Android Chrome first because phone operation is central to DigiStream.

## 9. Accessibility requirements

Target WCAG 2.2 AA.

Mandatory:

- contrast testing for all text and controls;
- visible keyboard focus indicators;
- no colour-only meaning;
- semantic headings and landmarks;
- labelled inputs and icon buttons;
- keyboard-operable menus, dialogs, tabs and players;
- screen-reader announcements for connection and live-state changes;
- reduced-motion handling for pulsing dots, animated waveforms and transitions;
- accessible alternatives to charts, maps and waveform-only information;
- captions are not applicable to audio-only content, but transcripts and descriptions should be considered for recordings.

Green shades in the reference screens are directional. Actual tokens must be selected using contrast measurements rather than copied by eye.

## 10. Creator/listener relationship

The creator and listener surfaces should share the same brand, components and state language, but they should not become identical products.

- Listener experience: simple, immersive and recovery-focused.
- Creator experience: operational, diagnostic and action-focused.

The bridge between them is an exact listener preview mode inside the creator workspace. Preview options should eventually include:

- desktop public listener;
- mobile public listener;
- unlisted-link view;
- private-member view;
- waiting/scheduled view;
- reconnecting/offline view;
- ended view.

## 11. Data honesty

The reference screens contain illustrative names, dates, organisations, listener counts, analytics and health metrics. They are design examples only.

Implementation rules:

- never hardcode sample metrics into production screens;
- show `Not available yet` rather than a fabricated number;
- separate listener socket presence from media listener counts;
- mark delayed analytics with collection/update timing;
- health labels must be derived from measurable thresholds;
- verification badges require a real verification model;
- subscription plans and billing controls remain hidden until commerce exists.

## 12. Copy and terminology

Preferred plain-language terms:

- Broadcast rather than stream session in the UI.
- Studio audio rather than contribution provider.
- Public delivery rather than OME output.
- Hear studio audio / Self-monitor rather than ambiguous Monitor.
- Request to speak rather than call-in where listener-facing.
- Guest waiting room rather than admission queue.
- Listener preview rather than audience emulator.

Technical provider names belong in diagnostics, documentation and support views.

## 13. Implementation order

1. Save and version the reference screens and this blueprint.
2. Introduce shared design tokens and base components.
3. Build responsive shells for public listener and creator workspace.
4. Design and implement empty, loading, error and disconnected states.
5. Apply accessibility and keyboard requirements.
6. Align current creator studio, guest waiting room, listener playback and chat with the design system.
7. Add real listener preview modes.
8. Implement recordings and analytics only when supporting backend data is real.
9. Add visual regression tests and viewport coverage.

## 14. Anti-drift rules

A pull request that adds or materially changes UI must state:

- which reference screen or design rule it follows;
- which responsive widths were tested;
- which empty/error/loading states were added;
- keyboard and focus behaviour;
- whether displayed values are real, estimated or placeholders;
- screenshots or visual-test evidence for significant changes.

Do not redesign the visual identity screen by screen. Amend this document deliberately when the product direction changes.
