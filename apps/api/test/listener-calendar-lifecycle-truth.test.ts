import assert from 'node:assert/strict';
import test from 'node:test';
import { listenerCalendarHref } from '../../web/src/features/listening/listener-lifecycle-presentation';

const broadcast = {
  id: 'broadcast-1',
  title: 'Sunday service',
  description: 'A live audio service',
  scheduledStartAt: '2026-08-05T10:00:00.000Z',
  organisation: { name: 'DigiStream Church' },
  channel: { name: 'Main channel' },
};

const pageUrl = 'https://example.test/org/main/sunday-service';

test('offers a deterministic calendar file only before the scheduled start', () => {
  const href = listenerCalendarHref(
    broadcast,
    pageUrl,
    Date.parse('2026-08-05T09:00:00.000Z'),
  );

  assert.ok(href);
  const calendar = decodeURIComponent(href.split(',')[1] ?? '');
  assert.match(calendar, /DTSTAMP:20260805T090000Z/);
  assert.match(calendar, /DTSTART:20260805T100000Z/);
  assert.match(calendar, /SUMMARY:Sunday service/);
});

test('does not offer a calendar action at or after the scheduled start', () => {
  assert.equal(
    listenerCalendarHref(
      broadcast,
      pageUrl,
      Date.parse('2026-08-05T10:00:00.000Z'),
    ),
    null,
  );
  assert.equal(
    listenerCalendarHref(
      broadcast,
      pageUrl,
      Date.parse('2026-08-05T10:00:01.000Z'),
    ),
    null,
  );
});

test('does not offer calendar actions for missing or invalid schedule data', () => {
  assert.equal(
    listenerCalendarHref({ ...broadcast, scheduledStartAt: null }, pageUrl),
    null,
  );
  assert.equal(
    listenerCalendarHref({ ...broadcast, scheduledStartAt: 'not-a-date' }, pageUrl),
    null,
  );
});
