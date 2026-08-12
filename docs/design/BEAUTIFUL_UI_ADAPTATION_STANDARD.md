# DigiStream Beautiful UI Adaptation Standard

Status: **mandatory implementation standard subordinate to `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`**

External reference: `https://beautiful-ui-five.vercel.app/`

Beautiful UI is a reference for component grammar, density, hierarchy and interaction quality. It is not a theme to clone and not a product specification.

## 1. Core hybrid rule

The target is:

> DigiStream cream dotted canvas + DigiStream dusty-pink brand anchor + white/warm-white operational surfaces + restrained supporting tints + Beautiful UI-quality compact component grammar + modern sans-serif ordinary UI.

Do not remove DigiStream's cream dotted identity.

Do not keep the old all-cream/all-pink giant-card treatment either.

## 2. What to borrow

Borrow:

- compact Sidebar Nav hierarchy;
- live Search/CommandSearch behavior;
- Task Rows;
- Filter Table / Records Table;
- compact Loading State;
- Approval Card / explicit confirmation;
- compact human Chat hierarchy;
- Context Cards;
- trustworthy Insight Cards;
- Selection Actions when real;
- subtle borders;
- restrained state indicators;
- neutral operational surfaces;
- strong alignment;
- minimal nested shadow;
- one obvious primary action.

Do not borrow by default:

- AI Thinking/reasoning traces;
- model picker;
- prompt bar;
- fine-tuning UI;
- code-generation surfaces;
- agent tool-call history.

## 3. What DigiStream must preserve

- cream dotted application canvas;
- dusty-pink principal brand accent;
- DigiStream user-visible branding;
- broadcast-specific lifecycle language;
- creator/listener/guest product responsibilities;
- real API-backed state;
- Studio microphone/private/public-delivery separation;
- responsive/accessibility requirements;
- tactile personality without visual clutter.

## 4. Typography adaptation

Beautiful UI's cleanliness must be translated into DigiStream using the modern sans-serif contract in the Complete Spec/Constitution.

Preferred normal UI family: Manrope (with documented fallbacks).

Mono is technical-only.

Do not interpret “technical product” as permission to make ordinary buttons, navigation, marketing copy, forms, footer links or error prose look like a terminal/typewriter interface.

## 5. Colour composition

Foundation:

- cream dotted canvas;
- white/warm-white/soft-neutral operational surfaces;
- near-black text.

Brand:

- dusty pink primary.

Supporting grouping tints:

- lavender;
- sky;
- mint;
- amber;
- peach/rose.

Normally use only 1–2 supporting accent families in one visible region.

Supporting accents never replace semantic live/success/warning/danger/info state.

## 6. Surface/radius/shadow adaptation

- rows/tables: dividers/borders, usually no shadow;
- ordinary panels: none or subtle shadow;
- search/dropdown: modest floating shadow;
- modal/sheet: stronger soft elevation;
- hard-offset brand shadow: rare marketing accent only.

Ordinary controls/panels use restrained 6–10px radius. Avoid square-everything and avoid huge rounded SaaS cards.

## 7. Pattern mapping to DigiStream

### Sidebar Nav

Use for creator workspace navigation.

Requirements:

- compact rows;
- real section grouping;
- subtle selected state;
- workspace/account context;
- truthful counts only;
- modern sans typography;
- no giant icon tiles.

### Search / CommandSearch

Use for authorized resource/action discovery where architecture supports it.

Potential real actions/resources:

- create broadcast;
- open current Studio;
- find broadcast;
- find recording;
- switch workspace;
- open settings.

Do not expose unauthorized/private data.

### Task Rows

Use for real staged/readiness work, such as:

```text
Microphone            Ready
Private Studio        Connected
Public delivery       Preparing
```

Never fabricate stages or percentages.

### Filter Table / Records Table

Use for Broadcasts, Recordings, users/team/channels/sessions/admin records when comparison matters.

Desktop uses structured rows/columns. Mobile transforms to compact stacked records rather than forcing horizontal scroll.

### Loading State

Use for genuine asynchronous wait. Determinate progress only when measurable.

### Approval Card / confirmation

Use for consequential actions such as:

- End broadcast;
- Delete recording;
- Suspend user;
- Remove participant/member;
- Revoke session.

Copy states the actual consequence and uses explicit action labels.

### Chat

Adapt message density and composer hierarchy for human Studio Lobby/live communication. No AI reasoning traces.

### Context Cards

Use for selected organisation/channel/broadcast/recording/guest context and supporting technical information.

### Insight Cards

Use only for trustworthy analytics with real source/scope/time range.

## 8. Landing-page adaptation

Beautiful UI's discipline should reduce visual bloat on the public landing page.

Do not use:

- poster-scale mobile headline;
- four giant stacked feature cards;
- tall numbered cards for simple steps;
- a random ungrouped footer;
- monospace CTAs/footer links.

Use:

- compact header;
- controlled hero;
- clear CTA hierarchy;
- compact capability rows/tiles;
- compact three-step journey;
- meaningful supporting sections;
- one final CTA;
- grouped responsive footer;
- DigiStream branding.

The exact contract is in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md`.

## 9. Error/offline adaptation

Loading/offline/error states should be calm and compact.

Connectivity banners must preserve readable horizontal button labels. On mobile, deliberately stack message/action rather than allowing a button to collapse into vertical letters.

Blocking state pages normally use compact centered content, not giant empty posters.

## 10. Data and product truth

Never use a Beautiful UI pattern to fabricate:

- metrics;
- readiness;
- listener counts;
- lifecycle state;
- progress;
- recording/replay availability;
- permissions;
- success.

## 11. Anti-clone / anti-duplication

Do not copy Beautiful UI source code without verified license/provenance.

Recreate patterns in the DigiStream design system and reuse existing product routes/APIs/business logic.

Do not create duplicate product pages merely to match a demo component.

## 12. Completion

Beautiful UI adaptation is not complete merely because colours, radius, shadows, TaskRow or ContextCard changed.

The required shared component families and screen completion gates are defined in `DIGISTREAM_UI_V2_COMPLETE_SPEC.md` and must be implemented before the migration can be called complete.
