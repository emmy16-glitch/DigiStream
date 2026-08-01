from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise SystemExit(f"Expected text not found in {path}: {old[:140]!r}")
    file.write_text(content.replace(old, new, 1))
    print(f"updated {path}")


page = "apps/web/src/features/listening/ListenerBroadcastPage.tsx"

replace_once(
    page,
    "import { ApiClientError, apiRequest } from '../../lib/api-client';",
    "import { Icon } from '../../design-system/Icon';\n"
    "import { ApiClientError, apiRequest } from '../../lib/api-client';",
)

replace_once(
    page,
    "import type { ListenerRoute } from './listener-route';",
    "import {\n"
    "  listenerArtLabel,\n"
    "  listenerCalendarHref,\n"
    "  listenerCountdown,\n"
    "} from './listener-lifecycle-presentation';\n"
    "import type { ListenerRoute } from './listener-route';",
)

replace_once(
    page,
    "import './listener-playback.css';",
    "import './listener-playback.css';\nimport './listener-lifecycle-trust.css';",
)

replace_once(
    page,
    "  const [online, setOnline] = useState(navigator.onLine);",
    "  const [online, setOnline] = useState(navigator.onLine);\n"
    "  const [clockNow, setClockNow] = useState(() => Date.now());",
)

replace_once(
    page,
    "  useEffect(() => {\n    const offlineHandler = () => {",
    "  useEffect(() => {\n"
    "    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);\n"
    "    return () => window.clearInterval(timer);\n"
    "  }, []);\n\n"
    "  useEffect(() => {\n    const offlineHandler = () => {",
)

replace_once(
    page,
    "  function togglePlayback() {",
    "  async function refreshBroadcastStatus() {\n"
    "    if (!online) {\n"
    "      setPhase('reconnecting');\n"
    "      setMessage('Your device is offline. Broadcast status will refresh when the connection returns.');\n"
    "      return;\n"
    "    }\n"
    "    setBusy(true);\n"
    "    setError('');\n"
    "    try {\n"
    "      const current = await loadMetadata();\n"
    "      removePlayer();\n"
    "      setPhase(\n"
    "        current.status === 'completed' ||\n"
    "        current.status === 'cancelled' ||\n"
    "        current.status === 'failed'\n"
    "          ? 'ended'\n"
    "          : playableStatuses.has(current.status)\n"
    "            ? 'ready'\n"
    "            : 'waiting',\n"
    "      );\n"
    "      setMessage(statusCopy(current));\n"
    "    } catch (requestError) {\n"
    "      setError(readableError(requestError));\n"
    "      setPhase('error');\n"
    "      setMessage('Broadcast details could not be refreshed.');\n"
    "    } finally {\n"
    "      setBusy(false);\n"
    "    }\n"
    "  }\n\n"
    "  function togglePlayback() {",
)

old_computed = """  const primaryLabel =
    phase === 'playing' || phase === 'buffering'
      ? 'Pause'
      : phase === 'paused'
        ? 'Resume'
        : phase === 'reconnecting'
          ? 'Reconnecting…'
          : isPlayable
            ? 'Listen live'
            : 'Check live status';
  const displayStatus = broadcast
    ? presentationStatus(broadcast.status, broadcast.scheduledStartAt)
    : null;
  const connectionDetail = !online
    ? 'Network unavailable'
    : isPlayable
      ? protocolLabel(activeProtocol)
      : 'Waiting for the broadcast to enter a playable state';
"""
new_computed = """  const primaryLabel =
    phase === 'playing' || phase === 'buffering'
      ? 'Pause'
      : phase === 'paused'
        ? 'Resume'
        : phase === 'reconnecting'
          ? 'Reconnecting…'
          : 'Listen live';
  const displayStatus = broadcast
    ? presentationStatus(
        broadcast.status,
        broadcast.scheduledStartAt,
        clockNow,
      )
    : null;
  const artLabel = listenerArtLabel(displayStatus);
  const countdown =
    broadcast &&
    (displayStatus === 'scheduled' || displayStatus === 'starting')
      ? listenerCountdown(broadcast.scheduledStartAt, clockNow)
      : null;
  const calendarHref =
    broadcast && displayStatus === 'scheduled' && countdown
      ? listenerCalendarHref(broadcast, shareUrl)
      : null;
  const connectionDetail = !online
    ? 'Network unavailable'
    : isPlayable
      ? protocolLabel(activeProtocol)
      : displayStatus === 'scheduled'
        ? 'Audio controls will appear after the broadcast is live'
        : displayStatus === 'starting'
          ? 'The creator is preparing the listener audio path'
          : 'No live audio path is available in this lifecycle state';
"""
replace_once(page, old_computed, new_computed)

replace_once(
    page,
    '    <main className="listener-page">',
    "    <main\n"
    "      className={`listener-page listener-lifecycle-${displayStatus ?? 'loading'}`}\n"
    "    >",
)

replace_once(
    page,
    "          <div className={`listener-orb ${phase === 'playing' ? 'playing' : ''}`} aria-hidden=\"true\">",
    "          <div\n"
    "            aria-hidden=\"true\"\n"
    "            className={`listener-orb ${displayStatus ?? 'loading'} ${phase === 'playing' ? 'playing' : ''}`}\n"
    "            data-lifecycle-label={artLabel}\n"
    "          >",
)

replace_once(
    page,
    """          <p className="listener-description">
            {broadcast?.description ?? 'Live audio delivered through DigiStream.'}
          </p>

          <div className={`listener-status listener-status-${phase}`}>
""",
    """          <p className="listener-description">
            {broadcast?.description ?? 'Live audio delivered through DigiStream.'}
          </p>

          {countdown ? (
            <div className="listener-countdown">
              <Icon name="calendar" />
              <strong>{countdown}</strong>
              <span>{formatDate(broadcast?.scheduledStartAt ?? null)}</span>
            </div>
          ) : null}

          <div className={`listener-status listener-status-${phase}`}>
""",
)

old_controls = """          <div className="listener-controls">
            <button
              className="listener-play-button"
              disabled={busy || signedInRequired || phase === 'reconnecting'}
              onClick={togglePlayback}
              type="button"
            >
              <span aria-hidden="true">{phase === 'playing' || phase === 'buffering' ? 'Ⅱ' : '▶'}</span>
              {primaryLabel}
            </button>
            <button className="listener-icon-button" onClick={toggleMute} type="button" aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted || volume === 0 ? '×' : '◖'}
            </button>
            <label className="listener-volume">
              <span className="sr-only">Volume</span>
              <input
                aria-label="Volume"
                max="100"
                min="0"
                onChange={(event) => changeVolume(Number(event.target.value))}
                type="range"
                value={muted ? 0 : volume}
              />
              <output>{muted ? 0 : Math.round(volume)}%</output>
            </label>
          </div>

          <div className="listener-secondary-actions">
            <button onClick={() => void startPlayback(true)} type="button">Retry playback</button>
            <button onClick={() => void copyShareLink()} type="button">Copy listener link</button>
          </div>
"""
new_controls = """          {isPlayable ? (
            <div className="listener-controls">
              <button
                className="listener-play-button"
                disabled={busy || signedInRequired || phase === 'reconnecting'}
                onClick={togglePlayback}
                type="button"
              >
                <Icon
                  name={
                    phase === 'playing' || phase === 'buffering'
                      ? 'pause'
                      : 'play'
                  }
                />
                {primaryLabel}
              </button>
              <button
                aria-label={muted ? 'Unmute' : 'Mute'}
                aria-pressed={muted}
                className="listener-icon-button"
                onClick={toggleMute}
                type="button"
              >
                <Icon name={muted || volume === 0 ? 'volume-muted' : 'volume'} />
              </button>
              <label className="listener-volume">
                <span className="sr-only">Volume</span>
                <input
                  aria-label="Volume"
                  max="100"
                  min="0"
                  onChange={(event) => changeVolume(Number(event.target.value))}
                  type="range"
                  value={muted ? 0 : volume}
                />
                <output>{muted ? 0 : Math.round(volume)}%</output>
              </label>
            </div>
          ) : null}

          {!isPlayable &&
          (displayStatus === 'scheduled' ||
            displayStatus === 'starting' ||
            displayStatus === 'overdue' ||
            displayStatus === 'draft') ? (
            <div className="listener-waiting-actions">
              <button
                disabled={busy}
                onClick={() => void refreshBroadcastStatus()}
                type="button"
              >
                <Icon name="refresh" />
                Refresh broadcast status
              </button>
              {calendarHref ? (
                <a download="digistream-broadcast.ics" href={calendarHref}>
                  <Icon name="calendar" />
                  Add to calendar
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="listener-secondary-actions">
            {isPlayable && phase === 'error' ? (
              <button onClick={() => void startPlayback(true)} type="button">
                <Icon name="refresh" />
                Retry playback
              </button>
            ) : null}
            <button onClick={() => void copyShareLink()} type="button">
              <Icon name="copy" />
              Copy listener link
            </button>
            <a href="/listen">
              <Icon name="arrow-right" />
              Back to discovery
            </a>
          </div>
"""
replace_once(page, old_controls, new_controls)

replace_once(
    page,
    """            <div>
              <dt>Scheduled</dt>
              <dd>{formatDate(broadcast?.scheduledStartAt ?? null)}</dd>
            </div>
""",
    """            <div>
              <dt>
                {displayStatus === 'scheduled' || displayStatus === 'starting'
                  ? 'Starts'
                  : 'Scheduled'}
              </dt>
              <dd>{formatDate(broadcast?.scheduledStartAt ?? null)}</dd>
            </div>
""",
)

# Extend listener trust browser coverage.
test_path = "tests/ui/listener-trust.spec.ts"
replace_once(
    test_path,
    """  await expect(page.locator('.listener-live-badge.scheduled')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen live' })).toHaveCount(0);
""",
    """  await expect(page.locator('.listener-live-badge.scheduled')).toBeVisible();
  await expect(page.locator('.listener-orb')).toHaveAttribute(
    'data-lifecycle-label',
    'UPCOMING',
  );
  await expect(page.getByText(/Starts in /)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute(
    'download',
    'digistream-broadcast.ics',
  );
  await expect(page.getByRole('button', { name: 'Listen live' })).toHaveCount(0);
""",
)

replace_once(
    test_path,
    """test('organisation owner receives creator action instead of listener call-in', async ({ page }) => {
""",
    """test('live lifecycle reveals audio controls without changing scheduled pages', async ({ page }) => {
  await mockVisitor(page);
  await mockBroadcast(page, 'live');
  await page.goto(routePath);

  await expect(page.locator('.listener-orb')).toHaveAttribute(
    'data-lifecycle-label',
    'LIVE',
  );
  await expect(page.getByRole('button', { name: 'Listen live' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible();
  await expect(page.getByLabel('Volume')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveCount(0);
});

test('organisation owner receives creator action instead of listener call-in', async ({ page }) => {
""",
)

# Keep the roadmap aligned with behaviour already covered by this slice.
roadmap = "docs/ROADMAP.md"
roadmap_updates = {
    "- [ ] Remove every scheduled-state control or visual that falsely implies live playback":
        "- [x] Remove every scheduled-state control or visual that falsely implies live playback",
    "- [ ] Make public listener actions role-aware for organisation owners, admins and broadcasters":
        "- [x] Make public listener actions role-aware for organisation owners, admins and broadcasters",
    "- [ ] Replace owner-facing **Request to speak** with **Manage broadcast**, **Open studio** or **Open backstage** as appropriate":
        "- [x] Replace owner-facing **Request to speak** with **Manage broadcast**, **Open studio** or **Open backstage** as appropriate",
    "- [ ] Render distinct scheduled, starting, live, reconnecting, ending, completed, cancelled and failed listener layouts":
        "- [x] Render distinct scheduled, starting, live, reconnecting, ending, completed, cancelled and failed listener layouts",
    "- [ ] Remove permanent `LIVE` artwork from scheduled events":
        "- [x] Remove permanent `LIVE` artwork from scheduled events",
    "- [ ] Prevent the `Live now` navigation state from appearing active for an upcoming event":
        "- [x] Prevent the `Live now` navigation state from appearing active for an upcoming event",
    "- [ ] Hide playback, mute, volume and retry controls while a broadcast is scheduled":
        "- [x] Hide playback, mute, volume and retry controls while a broadcast is scheduled",
    "- [ ] Add a text countdown, exact local date/time and optional calendar action for upcoming events":
        "- [x] Add a text countdown, exact local date/time and optional calendar action for upcoming events",
    "- [ ] Add a contextual route back to discovery from event pages":
        "- [x] Add a contextual route back to discovery from event pages",
}
for old, new in roadmap_updates.items():
    replace_once(roadmap, old, new)

print('phase 6A listener lifecycle patch applied')
