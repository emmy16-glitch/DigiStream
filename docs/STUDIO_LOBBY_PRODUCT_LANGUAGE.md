# Studio Lobby product language

DigiStream/Echoo uses **Studio Lobby** as the user-facing name for the private guest and call-in preparation area that was previously labelled **Backstage**.

## Product meaning

The Studio Lobby is where a creator can:

- review listener call-in requests;
- create secure guest invitations;
- admit accepted guests;
- see connected participants;
- mute, unmute or remove controllable guest participants.

External guests also see **Studio Lobby** while preparing their microphone, waiting for admission and joining or leaving the private contribution room.

## Compatibility boundary

This is a product-language change, not a backend rename. Existing internal identifiers remain authoritative where changing them would create migration risk, including:

- `/backstage/participants` API routes;
- internal `BackstageParticipant` and related implementation names;
- the `digistream.creator-backstage` modal-history state key;
- existing backstage CSS class names and technical tests.

The creator route is `/creator/studio-lobby`. The previous `/creator/audience` route remains a compatibility alias so saved links do not unexpectedly drop users on another creator page.

Future user-facing copy should say **Studio Lobby**. Internal `backstage` names should only be renamed as a separate compatibility-safe refactor, not as part of presentation work.
