from pathlib import Path
page = Path('apps/web/src/features/listening/ListenerBroadcastPage.tsx')
text = page.read_text()
old = "  const resetPlaybackQuality = useCallback(() => {\n    playbackStartedAtRef.current = null;"
new = "  const resetPlaybackQuality = useCallback(() => {\n    hasPlayedRef.current = false;\n    playbackStartedAtRef.current = null;"
if old not in text:
    raise SystemExit('quality reset anchor missing')
page.write_text(text.replace(old, new, 1))
Path('scripts/fix-listener-quality-reset.py').unlink()
Path('.github/workflows/fix-listener-quality-reset.yml').unlink()
