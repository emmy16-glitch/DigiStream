from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise SystemExit(f"Expected text was not found in {path}: {old[:120]!r}")
    file.write_text(content.replace(old, new, 1))
    print(f"updated {path}")


page = "apps/web/src/features/listening/ListenerBroadcastPage.tsx"

replace_once(
    page,
    """import {
  listenerArtLabel,
  listenerCalendarHref,
  listenerCountdown,
} from './listener-lifecycle-presentation';
import type { ListenerRoute } from './listener-route';""",
    """import {
  listenerArtLabel,
  listenerCalendarHref,
  listenerCountdown,
} from './listener-lifecycle-presentation';
import { listenerConnectionPresentation } from './listener-connection-presentation';
import type { ListenerRoute } from './listener-route';""",
)

replace_once(
    page,
    """import './listener-playback.css';
import './listener-lifecycle-trust.css';""",
    """import './listener-playback.css';
import './listener-lifecycle-trust.css';
import './listener-resilience.css';""",
)

replace_once(
    page,
    """function protocolLabel(protocol: 'webrtc' | 'llhls' | null): string {
  return protocol === 'webrtc'
    ? 'WebRTC · ultra-low latency'
    : protocol === 'llhls'
      ? 'LL-HLS · reliable fallback'
      : 'Automatic WebRTC → LL-HLS';
}

""",
    "",
)

replace_once(
    page,
    """      player.on('sourceChanged', () => {
        const source = player.getCurrentSource();
        setActiveProtocol(source?.type === 'webrtc' ? 'webrtc' : source ? 'llhls' : null);
        setMessage(
          source?.type === 'webrtc'
            ? 'Using the ultra-low-latency WebRTC path.'
            : 'Using the reliable LL-HLS fallback path.',
        );
      });""",
    """      player.on('sourceChanged', () => {
        const source = player.getCurrentSource();
        setActiveProtocol(source?.type === 'webrtc' ? 'webrtc' : source ? 'llhls' : null);
        setMessage(
          source?.type === 'webrtc'
            ? 'DigiStream selected the fastest healthy playback path.'
            : 'DigiStream switched to a steadier playback path.',
        );
      });""",
)

replace_once(
    page,
    """  const connectionDetail = !online
    ? 'Network unavailable'
    : isPlayable
      ? protocolLabel(activeProtocol)
      : displayStatus === 'scheduled'
        ? 'Audio controls will appear after the broadcast is live'
        : displayStatus === 'starting'
          ? 'The creator is preparing the listener audio path'
          : 'No live audio path is available in this lifecycle state';""",
    """  const connectionPresentation = listenerConnectionPresentation({
    activeProtocol,
    online,
    phase,
    playable: isPlayable,
    status: displayStatus,
  });""",
)

replace_once(
    page,
    """  return (
    <main
      className={`listener-page listener-lifecycle-${displayStatus ?? 'loading'}`}
    >
      <header className="listener-header">
        <a className="listener-brand" href="/">
          <span aria-hidden="true">D</span>
          DigiStream
        </a>
        <a className="listener-discover-link" href="/listen">Discover live audio</a>
      </header>

      <section className="listener-shell" aria-live="polite">""",
    """  return (
    <div
      className={`listener-page listener-lifecycle-${displayStatus ?? 'loading'}`}
    >
      <section className="listener-shell" aria-live="polite">""",
)

replace_once(
    page,
    """          <div className={`listener-status listener-status-${phase}`}>
            <span className="listener-status-dot" />
            <div>
              <strong>{message}</strong>
              <small>{connectionDetail}</small>
            </div>
          </div>""",
    """          <div className={`listener-status listener-status-${phase}`}>
            <div>
              <strong
                className="listener-connection-heading"
                data-tone={connectionPresentation.tone}
              >
                {connectionPresentation.label}
              </strong>
              <small>{connectionPresentation.guidance}</small>
              <small>{message}</small>
            </div>
          </div>""",
)

replace_once(
    page,
    """          {signedInRequired ? (
            <div className="listener-private-notice">
              <strong>This is a private organisation broadcast.</strong>
              <span>Sign in through the creator studio with an organisation member account, then reopen this link.</span>
            </div>
          ) : null}

          {isPlayable ? (""",
    """          {signedInRequired ? (
            <div className="listener-private-notice">
              <strong>This is a private organisation broadcast.</strong>
              <span>Sign in through the creator studio with an organisation member account, then reopen this link.</span>
            </div>
          ) : null}

          <details className="listener-diagnostics">
            <summary>Technical details</summary>
            <div>
              <span>{connectionPresentation.technical}</span>
              <code>Playback phase: {phase}</code>
              <code>Broadcast state: {displayStatus ?? 'loading'}</code>
              {error ? <span>Latest error: {error}</span> : null}
            </div>
          </details>

          {isPlayable ? (""",
)

replace_once(
    page,
    """      <footer className="listener-footer">
        WebRTC is attempted first for the lowest delay. DigiStream automatically falls back to LL-HLS when the browser or network cannot keep the WebRTC path healthy.
      </footer>
    </main>""",
    """    </div>""",
)

replace_once(
    "apps/web/src/App.tsx",
    "footer=\"WebRTC is attempted first for low delay. DigiStream automatically falls back to LL-HLS when a steadier playback path is required.\"",
    "footer=\"DigiStream automatically selects a healthy playback path and recovers short interruptions when possible.\"",
)

roadmap = "docs/ROADMAP.md"
replace_once(
    roadmap,
    "- [ ] Translate WebRTC, LL-HLS and provider language into listener-friendly connection states",
    "- [x] Translate WebRTC, LL-HLS and provider language into listener-friendly connection states",
)
replace_once(
    roadmap,
    "- [ ] Add evidence-based Stable, Unstable, Buffering, Reconnecting, Offline and Unavailable states",
    "- [x] Add evidence-based Stable, Buffering, Reconnecting, Offline and Unavailable states\n- [ ] Add measured Unstable state from jitter, packet-loss or repeated-buffering evidence",
)
replace_once(
    roadmap,
    "- [ ] Make manual retry primary only after bounded automatic recovery fails",
    "- [x] Make manual retry primary only after bounded automatic recovery fails",
)
replace_once(
    roadmap,
    "- [ ] Hide or collapse the full mobile volume slider while preserving mute",
    "- [x] Hide or collapse the full mobile volume slider while preserving mute",
)
replace_once(
    roadmap,
    "- [ ] Keep technical protocol data available only as secondary diagnostics",
    "- [x] Keep technical protocol data available only as secondary diagnostics",
)

print("listener resilience wiring applied")
