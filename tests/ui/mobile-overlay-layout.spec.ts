import { expect, test } from '@playwright/test';
import { calculateVisualViewportMetrics } from '../../apps/web/src/lib/use-mobile-overlay-layout';

test('visual viewport metrics preserve the visible height and keyboard inset', () => {
  expect(calculateVisualViewportMetrics(915, 915, 0)).toEqual({
    height: 915,
    offsetTop: 0,
    keyboardInset: 0,
  });

  expect(calculateVisualViewportMetrics(915, 520, 12)).toEqual({
    height: 520,
    offsetTop: 12,
    keyboardInset: 383,
  });
});

test('visual viewport metrics clamp invalid negative geometry', () => {
  expect(calculateVisualViewportMetrics(-10, -20, -5)).toEqual({
    height: 0,
    offsetTop: 0,
    keyboardInset: 0,
  });
});
