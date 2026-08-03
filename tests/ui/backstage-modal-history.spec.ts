import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const backstageSource = readFileSync(
  resolve(
    process.cwd(),
    'apps/web/src/features/guests/CreatorBackstageWorkspace.tsx',
  ),
  'utf8',
);

test('Backstage uses the shared browser history dismissal owner', () => {
  expect(backstageSource).toContain("useModalHistoryDismiss");
  expect(backstageSource).toContain("stateKey: 'digistream.creator-backstage'");
  expect(backstageSource).toContain('onClick={requestClose}');
  expect(backstageSource).toContain("if (event.key === 'Escape')");
  expect(backstageSource).not.toContain("window.addEventListener('keydown', closeOnEscape)");
});

test('Backstage contains keyboard focus and restores the opener', () => {
  expect(backstageSource).toContain('const dialogRef = useRef<HTMLElement | null>(null)');
  expect(backstageSource).toContain('const previousFocusRef = useRef<HTMLElement | null>(null)');
  expect(backstageSource).toContain('focusableElements(dialogRef.current');
  expect(backstageSource).toContain("if (event.key !== 'Tab'");
  expect(backstageSource).toContain('if (previous?.isConnected) previous.focus()');
  expect(backstageSource).toContain('ref={dialogRef}');
});
