import { expect, test, type Page } from '@playwright/test';

async function mountMotionFixture(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.id = 'uiq-motion-fixture';
    fixture.innerHTML = `
      <div class="backstage-row">Studio Lobby row</div>
      <a class="listener-discovery-card" href="#">Listener card</a>
      <div class="studio-signal-meter-bars" style="height: 100px">
        <i class="is-active" data-motion="studio-meter"></i>
      </div>
      <div class="guest-meter" style="height: 100px">
        <i class="hot" data-motion="guest-meter"></i>
      </div>
      <div class="echoo-call-in-panel">
        <span data-motion="call-in-child">Call-in content</span>
      </div>
      <div class="listener-orb playing">
        <i data-motion="listener-orb"></i>
      </div>
      <div class="echoo-system-spinner" data-motion="system-spinner"></div>
    `;
    document.body.appendChild(fixture);
  });
}

function everyDurationIs(value: string, expected: string): boolean {
  return value
    .split(',')
    .map((duration) => duration.trim())
    .every((duration) => duration === expected);
}

test('final motion cascade uses semantic compositor feedback on audited surfaces', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mountMotionFixture(page);

  const result = await page.evaluate(() => {
    const style = (selector: string) =>
      getComputedStyle(document.querySelector<HTMLElement>(selector)!);
    const row = style('#uiq-motion-fixture .backstage-row');
    const card = style('#uiq-motion-fixture .listener-discovery-card');
    const studioMeter = style('[data-motion="studio-meter"]');
    const guestMeter = style('[data-motion="guest-meter"]');

    return {
      rowProperty: row.transitionProperty,
      rowDuration: row.transitionDuration,
      cardProperty: card.transitionProperty,
      cardDuration: card.transitionDuration,
      studioMeterProperty: studioMeter.transitionProperty,
      studioMeterDuration: studioMeter.transitionDuration,
      studioMeterTransform: studioMeter.transform,
      guestMeterTransform: guestMeter.transform,
    };
  });

  expect(result.rowProperty).toBe('border-color');
  expect(everyDurationIs(result.rowDuration, '0.2s')).toBe(true);
  expect(result.cardProperty).toBe('transform, border-color, background-color');
  expect(everyDurationIs(result.cardDuration, '0.2s')).toBe(true);
  expect(result.studioMeterProperty).toBe('transform, opacity');
  expect(everyDurationIs(result.studioMeterDuration, '0.08s')).toBe(true);
  expect(result.studioMeterTransform).not.toBe('none');
  expect(result.guestMeterTransform).not.toBe('none');
});

test('reduced motion stops interpolation while preserving truthful meter state', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mountMotionFixture(page);

  const result = await page.evaluate(() => {
    const style = (selector: string) =>
      getComputedStyle(document.querySelector<HTMLElement>(selector)!);
    const row = style('#uiq-motion-fixture .backstage-row');
    const card = style('#uiq-motion-fixture .listener-discovery-card');
    const studioMeter = style('[data-motion="studio-meter"]');
    const guestMeter = style('[data-motion="guest-meter"]');
    const callInChild = style('[data-motion="call-in-child"]');
    const listenerOrb = style('[data-motion="listener-orb"]');
    const systemSpinner = style('[data-motion="system-spinner"]');

    return {
      rowDuration: row.transitionDuration,
      cardDuration: card.transitionDuration,
      studioMeterDuration: studioMeter.transitionDuration,
      studioMeterTransform: studioMeter.transform,
      guestMeterDuration: guestMeter.transitionDuration,
      guestMeterTransform: guestMeter.transform,
      callInDuration: callInChild.transitionDuration,
      listenerAnimation: listenerOrb.animationName,
      systemSpinnerAnimation: systemSpinner.animationName,
    };
  });

  expect(everyDurationIs(result.rowDuration, '0s')).toBe(true);
  expect(everyDurationIs(result.cardDuration, '0s')).toBe(true);
  expect(everyDurationIs(result.studioMeterDuration, '0s')).toBe(true);
  expect(everyDurationIs(result.guestMeterDuration, '0s')).toBe(true);
  expect(everyDurationIs(result.callInDuration, '0s')).toBe(true);
  expect(result.listenerAnimation).toBe('none');
  expect(result.systemSpinnerAnimation).toBe('none');

  // Reduced motion removes interpolation, not the live information itself.
  expect(result.studioMeterTransform).not.toBe('none');
  expect(result.guestMeterTransform).not.toBe('none');
});
