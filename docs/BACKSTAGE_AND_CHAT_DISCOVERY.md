# Backstage and chat discovery

This Phase 6A slice makes the producer call-in workflow obvious and keeps scheduled listener chat honest and compact.

## Creator navigation

The creator workspace now uses **Backstage** consistently on desktop and mobile. The existing `/creator/audience` path remains stable, but the user-facing `Audience` and `People` labels are removed because they did not explain the operational task.

The Backstage page tells producers exactly what the workspace supports:

- review pending listener call-in requests;
- approve a request to generate a secure guest link;
- reject a request without creating an invitation;
- create direct guest invitations;
- admit waiting participants;
- control connected guest participants.

The primary action is named **Open call-in desk**. It opens the existing authenticated Creator Backstage workspace and does not create synthetic queue counts or duplicate the API workflow.

## Scheduled chat

Scheduled and starting broadcasts do not render a live chat header, message counter, history list or composer. They show one compact availability notice:

- **Chat will open when the broadcast starts** for scheduled events;
- **Chat will open when public audio is ready** while the broadcast is starting.

The notice automatically changes to the real `BroadcastChat` component when broadcast metadata becomes playable. It uses the shared chat icon and contains no fake messages or interaction controls.

## Compatibility and authorization

The route remains `/creator/audience` so existing links continue to work. Client navigation wording does not change backend roles or permissions. Call-in listing, approval, rejection, invitations and participant controls continue to use the existing organisation-scoped API authorization checks.

## Regression coverage

Responsive browser coverage verifies that:

- Backstage is the visible creator navigation label;
- the obsolete People label is absent;
- the Backstage page exposes the producer call-in desk action;
- the action opens the authenticated Creator Backstage dialog;
- scheduled listener chat has no chat header or textbox;
- the compact scheduled state uses the shared chat icon and has no forced tall minimum height.
