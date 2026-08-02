from pathlib import Path

page = Path('apps/web/src/features/listening/ListenerBroadcastPage.tsx')
text = page.read_text()
text = text.replace("import { listenerConnectionPresentation } from './listener-connection-presentation';", "import { listenerConnectionPresentation } from './listener-connection-presentation';\nimport {\n  listenerPlaybackQualityEvidence,\n  pruneListenerBufferingEvents,\n} from './listener-playback-quality';")
text = text.replace("  const hasPlayedRef = useRef(false);", "  const hasPlayedRef = useRef(false);\n  const playbackStartedAtRef = useRef<number | null>(null);\n  const bufferingEventsRef = useRef<number[]>([]);\n  const lastPlayerStateRef = useRef<string | null>(null);\n  const [unstableConnection, setUnstableConnection] = useState(false);")
text = text.replace("  const removePlayer = useCallback(() => {", "  const resetPlaybackQuality = useCallback(() => {\n    playbackStartedAtRef.current = null;\n    bufferingEventsRef.current = [];\n    lastPlayerStateRef.current = null;\n    setUnstableConnection(false);\n  }, []);\n\n  const updatePlaybackQuality = useCallback((observedAt = Date.now()) => {\n    bufferingEventsRef.current = pruneListenerBufferingEvents(\n      bufferingEventsRef.current,\n      observedAt,\n    );\n    setUnstableConnection(\n      listenerPlaybackQualityEvidence({\n        bufferingEvents: bufferingEventsRef.current,\n        observedAt,\n        playbackStartedAt: playbackStartedAtRef.current,\n      }).unstable,\n    );\n  }, []);\n\n  const removePlayer = useCallback(() => {")
text = text.replace("    try {\n      player?.remove();", "    resetPlaybackQuality();\n    try {\n      player?.remove();")
text = text.replace("  }, []);\n\n  const loadMetadata", "  }, [resetPlaybackQuality]);\n\n  const loadMetadata", 1)
text = text.replace("        const next = state?.newstate ?? player.getState();\n        if (next === 'playing') {", "        const next = state?.newstate ?? player.getState();\n        const previous = lastPlayerStateRef.current;\n        lastPlayerStateRef.current = next;\n        if (next === 'playing') {")
text = text.replace("          hasPlayedRef.current = true;", "          hasPlayedRef.current = true;\n          if (playbackStartedAtRef.current === null) {\n            playbackStartedAtRef.current = Date.now();\n          }\n          updatePlaybackQuality();")
text = text.replace("        } else if (next === 'loading' || next === 'stalled') {\n          setPhase(hasPlayedRef.current ? 'buffering' : 'loading');", "        } else if (next === 'loading' || next === 'stalled') {\n          if (\n            hasPlayedRef.current &&\n            previous !== 'loading' &&\n            previous !== 'stalled'\n          ) {\n            bufferingEventsRef.current.push(Date.now());\n            updatePlaybackQuality();\n          }\n          setPhase(hasPlayedRef.current ? 'buffering' : 'loading');")
text = text.replace("    [broadcast?.title, muted, removePlayer, scheduleRecovery, volume],", "    [broadcast?.title, muted, removePlayer, scheduleRecovery, updatePlaybackQuality, volume],")
text = text.replace("  useEffect(() => {\n    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);", "  useEffect(() => {\n    if (phase !== 'playing' && phase !== 'paused') return undefined;\n    const timer = window.setInterval(() => updatePlaybackQuality(), 5_000);\n    return () => window.clearInterval(timer);\n  }, [phase, updatePlaybackQuality]);\n\n  useEffect(() => {\n    const timer = window.setInterval(() => setClockNow(Date.now()), 30_000);")
text = text.replace("    status: displayStatus,\n  });", "    status: displayStatus,\n    unstable: unstableConnection,\n  });")
page.write_text(text)

presentation = Path('apps/web/src/features/listening/listener-connection-presentation.ts')
p = presentation.read_text()
p = p.replace("  status: BroadcastPresentationStatus | null;\n};", "  status: BroadcastPresentationStatus | null;\n  unstable?: boolean;\n};")
p = p.replace("  status,\n}: ListenerConnectionInput)", "  status,\n  unstable = false,\n}: ListenerConnectionInput)")
p = p.replace("  if (phase === 'playing' || phase === 'paused') {\n    return {\n      label: phase === 'paused' ? 'Paused' : 'Stable',", "  if (phase === 'playing' || phase === 'paused') {\n    if (phase === 'playing' && unstable) {\n      return {\n        label: 'Unstable connection',\n        guidance: 'Audio is playing, but repeated buffering was measured recently.',\n        tone: 'warning',\n        technical: `${technicalTransport(activeProtocol)}; repeated buffering threshold reached`,\n      };\n    }\n    return {\n      label: phase === 'paused' ? 'Paused' : 'Stable',")
presentation.write_text(p)

test = Path('tests/ui/listener-playback-quality.spec.ts')
t = test.read_text()
t += """

test('quality returns to stable after buffering evidence ages out', () => {
  const playbackStartedAt = 100_000;
  expect(listenerPlaybackQualityEvidence({
    bufferingEvents: [140_000, 150_000, 160_000],
    observedAt: 170_000,
    playbackStartedAt,
  }).unstable).toBe(true);

  expect(listenerPlaybackQualityEvidence({
    bufferingEvents: pruneListenerBufferingEvents([140_000, 150_000, 160_000], 300_001),
    observedAt: 300_001,
    playbackStartedAt,
  }).unstable).toBe(false);
});
"""
test.write_text(t)

roadmap = Path('docs/ROADMAP.md')
r = roadmap.read_text().replace('- [ ] Add measured Unstable state from jitter, packet-loss or repeated-buffering evidence', '- [x] Add measured Unstable state from repeated-buffering evidence with bounded recovery to Stable')
roadmap.write_text(r)

Path('scripts/apply-listener-quality-wiring.py').unlink()
Path('.github/workflows/apply-listener-quality-wiring.yml').unlink()
