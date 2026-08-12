# Broadcast Studio UI Migration

This slice migrates the existing creator Broadcast Studio onto the complete DigiStream UI V2 system while preserving authenticated API, LiveKit contribution, readiness verification and public-delivery behavior.

## Authority

Read:

1. `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`;
2. `DIGISTREAM_UI_CONSTITUTION.md`;
3. `BEAUTIFUL_UI_ADAPTATION_STANDARD.md`;
4. `DESIGN_TOKENS.md`;
5. `DIGISTREAM_AI_IMPLEMENTATION_GUARDRAILS.md`;
6. Studio reference screens for composition/journey intent;
7. `../CREATOR_BROADCAST_STUDIO.md` for product/media/security behavior.

Legacy dark/emerald or Echoo visual wording is not current presentation authority.

## Studio visual rule

- preserve cream dotted creator shell/outer canvas;
- use a calm large white/warm-white/neutral central operational workspace;
- dusty pink remains brand anchor;
- use supporting tints sparingly for grouping;
- modern sans-serif ordinary UI;
- mono technical-only;
- semantic live/success/warning/danger/info stays truthful;
- compact task/readiness rows;
- compact context panels;
- restrained elevation/radius;
- no giant nested cards;
- no AI-agent interface styling.

## Primary hierarchy

Studio should make these truths immediately understandable:

1. selected organisation/channel/broadcast;
2. microphone/device state;
3. private Studio contribution state;
4. public listener-delivery state;
5. current lifecycle (draft/preparing/live/reconnecting/ending/completed);
6. recording state when real;
7. one critical contextual action;
8. bounded recovery;
9. secondary diagnostics.

## Beautiful UI pattern mapping

### Task Rows

Use for real readiness/recovery stages:

```text
Microphone            Ready
Private Studio        Connected
Public delivery       Preparing
```

or:

```text
Microphone            Ready
Private Studio        Connected
Public delivery       Reconnecting
```

Do not fabricate stages or percentages.

### Loading State

Use for real asynchronous connection, permission/device discovery, delivery preparation or authoritative lifecycle command completion.

### Context Card

Use for selected org/channel/broadcast and secondary technical details.

### Approval/Confirmation

Use for ending a broadcast or other consequential Studio actions. State the real consequence and use explicit labels.

## Preserved behavior

The migration does not weaken:

- short-lived contribution credentials;
- microphone-only publishing grants;
- server-side readiness verification;
- contribution/public-delivery separation;
- idempotent start/end commands;
- delivery readiness polling/reconciliation;
- provider-secret boundaries;
- safe local-media release.

## Responsive requirements

- critical controls reachable on small Android portrait;
- short-height landscape preserves current state + critical action;
- no ordinary horizontal overflow;
- diagnostics progressively disclose rather than causing excessive travel;
- mobile keyboard/focus/Back behavior remains correct.

## Branding

Visible product branding is DigiStream. Do not show Echoo in Studio/system-state lockups.

## Completion

Studio migration is complete only when the real implementation—not just tokens—matches the compact truthful hierarchy above and applicable Studio tests/responsive acceptance pass.
