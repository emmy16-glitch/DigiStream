# Mobile request-to-speak sheet

This Phase 6A slice hardens the listener call-in experience on phones, short landscape viewports and virtual keyboards without changing the call-in API or production workflow.

## Layout model

The request launcher is a fixed listener action. While it is visible, DigiStream adds explicit bottom content reservation through the `ds-listener-fixed-action-visible` body class so the launcher does not cover chat, status or footer content.

Opening the request panel removes that reservation and hides the launcher. The panel becomes a modal bottom sheet with:

- safe-area padding;
- a sticky close header;
- a sticky submission action;
- contained scrolling and overscroll behavior;
- a full-height short-landscape treatment;
- focus trapping, Escape dismissal and body-scroll restoration through the shared modal hook.

## Virtual-keyboard handling

Modern dynamic viewport units remain the primary CSS behavior. While the sheet is open, DigiStream also reads `window.visualViewport` when available and exposes the visible viewport height, top offset and calculated keyboard inset as CSS custom properties.

The sheet wrapper follows that visible viewport rather than the layout viewport. This prevents the Android keyboard from placing focused inputs or the submission action outside the usable screen. Window resize and orientation-change events provide the fallback when `visualViewport` is unavailable.

No user-agent detection is used.

## Identity and status continuity

For a signed-in listener who is not a production member of the broadcast organisation, the form pre-fills the authenticated display name and email. The user may still edit both fields before submission.

After submission, the modal remains open through:

- sending progress;
- success confirmation;
- pending status polling;
- approval or rejection guidance.

The launcher changes to the tracked status after the modal closes. Status tokens remain in session storage and are not exposed in page copy.

## Role-aware actions

Owners, administrators and broadcasters continue to receive **Manage broadcast**. Moderators receive **Open backstage**. Analysts do not receive a listener call-in action. These client decisions do not replace the API authorization boundary.

## Validation

Regression coverage verifies:

- visible-viewport and keyboard-inset calculations;
- launcher content reservation;
- launcher removal while the modal is open;
- safe-area and Visual Viewport geometry;
- signed-in profile prefill;
- shared close-icon use;
- body scroll locking and restoration;
- the open panel surviving success and pending-status transitions;
- the tracked launcher returning after dismissal.
