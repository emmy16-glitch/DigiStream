import type { BroadcastPresentationStatus } from '../../lib/broadcast-lifecycle';

type CalendarBroadcast = {
  id: string;
  title: string;
  description: string | null;
  scheduledStartAt: string | null;
  organisation: { name: string };
  channel: { name: string };
};

function escapeCalendarText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function calendarTimestamp(value: Date): string {
  return value
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function listenerArtLabel(
  status: BroadcastPresentationStatus | null,
): string {
  if (status === 'scheduled') return 'UPCOMING';
  if (status === 'overdue') return 'MISSED';
  if (status === 'starting') return 'CONNECTING';
  if (status === 'live') return 'LIVE';
  if (status === 'reconnecting') return 'RECOVERING';
  if (status === 'ending') return 'ENDING';
  if (status === 'completed') return 'ENDED';
  if (status === 'cancelled') return 'CANCELLED';
  if (status === 'failed') return 'UNAVAILABLE';
  if (status === 'draft') return 'PREPARING';
  return 'LOADING';
}

export function listenerCountdown(
  scheduledStartAt: string | null,
  now: number = Date.now(),
): string | null {
  if (!scheduledStartAt) return null;
  const startsAt = Date.parse(scheduledStartAt);
  if (!Number.isFinite(startsAt)) return null;
  const remainingMs = startsAt - now;
  if (remainingMs <= 0) return null;

  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  if (totalMinutes < 60) {
    return `Starts in ${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) {
    return minutes === 0
      ? `Starts in ${hours} hour${hours === 1 ? '' : 's'}`
      : `Starts in ${hours}h ${minutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0
    ? `Starts in ${days} day${days === 1 ? '' : 's'}`
    : `Starts in ${days}d ${remainingHours}h`;
}

export function listenerCalendarHref(
  broadcast: CalendarBroadcast,
  pageUrl: string,
): string | null {
  if (!broadcast.scheduledStartAt) return null;
  const start = new Date(broadcast.scheduledStartAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 60 * 60_000);
  const description = [
    broadcast.description,
    `${broadcast.organisation.name} · ${broadcast.channel.name}`,
    pageUrl,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n\n');

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DigiStream//Broadcast calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(broadcast.id)}@digistream`,
    `DTSTAMP:${calendarTimestamp(new Date())}`,
    `DTSTART:${calendarTimestamp(start)}`,
    `DTEND:${calendarTimestamp(end)}`,
    `SUMMARY:${escapeCalendarText(broadcast.title)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `URL:${escapeCalendarText(pageUrl)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`;
}
