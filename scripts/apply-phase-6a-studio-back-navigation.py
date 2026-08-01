from pathlib import Path

studio_path = Path('apps/web/src/features/broadcasting/CreatorBroadcastStudio.tsx')
studio = studio_path.read_text()

api_import = "import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';\n"
history_import = (
    api_import
    + "import { useModalHistoryDismiss } from '../../lib/use-modal-history-dismiss';\n"
)
if api_import not in studio:
    raise SystemExit('Studio API import anchor was not found.')
studio = studio.replace(api_import, history_import, 1)

old_close = """  const requestClose = useCallback(() => {
    if (isLiveCriticalPhase(phase) || deliveryRecovery) {
      setFailure(null);
      setError('End the broadcast before closing the studio so public delivery stops safely.');
      return;
    }
    void stopLocalMedia().finally(onClose);
  }, [deliveryRecovery, onClose, phase, stopLocalMedia]);
"""
new_close = """  const closeStudio = useCallback(() => {
    void stopLocalMedia().finally(onClose);
  }, [onClose, stopLocalMedia]);

  const explainBlockedClose = useCallback(() => {
    if (endConfirmationOpen) {
      setEndConfirmationOpen(false);
      return;
    }
    setFailure(null);
    setError('End the broadcast before closing the studio so public delivery stops safely.');
  }, [endConfirmationOpen]);

  const requestClose = useModalHistoryDismiss({
    active: open,
    blocked: liveCritical || endConfirmationOpen,
    onBlocked: explainBlockedClose,
    onDismiss: closeStudio,
    stateKey: 'digistream.broadcast-studio',
  });
"""
if old_close not in studio:
    raise SystemExit('Studio close-handler anchor was not found.')
studio = studio.replace(old_close, new_close, 1)
studio_path.write_text(studio)

responsive_path = Path('tests/ui/creator-responsive.spec.ts')
responsive = responsive_path.read_text()
old_test_close = """  await studio.getByRole('button', { name: 'Close broadcast studio' }).click();

  await page.goto('/creator/audience');
"""
new_test_close = """  const studioUrl = page.url();
  await page.goBack();
  await expect(studio).toHaveCount(0);
  expect(page.url()).toBe(studioUrl);

  await page.goto('/creator/audience');
"""
if old_test_close not in responsive:
    raise SystemExit('Responsive studio-close test anchor was not found.')
responsive = responsive.replace(old_test_close, new_test_close, 1)
responsive_path.write_text(responsive)

roadmap_path = Path('docs/ROADMAP.md')
roadmap = roadmap_path.read_text()
old_roadmap = '- [ ] Make browser and Android Back close the studio before leaving the workspace'
new_roadmap = '- [x] Make browser and Android Back close the studio before leaving the workspace'
if old_roadmap not in roadmap:
    raise SystemExit('Roadmap studio-back item was not found.')
roadmap_path.write_text(roadmap.replace(old_roadmap, new_roadmap, 1))
