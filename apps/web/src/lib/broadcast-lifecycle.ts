/**
 * Shared broadcast presentation helpers.
 *
 * The persisted database status (scheduled, live, completed, ...) is the only
 * source of truth for the broadcast lifecycle. These helpers derive an honest
 * *presentation* state from that status plus the raw ISO timestamps, without
 * ever mutating persisted data. They are deliberately timezone-safe: every
 * comparison uses the millisecond epoch of a parsed timestamp, never a
 * formatted display string.
 */

import type { BroadcastState } from '@digistream/contracts';

/** Broadcast statuses that represent an active, playable audio path. */
export const PLAYABLE_BROADCAST_STATUSES = new Set<BroadcastState>([
  'live',
  'reconnecting',
  'ending',
]);

/** Broadcast statuses that still represent an upcoming, not-yet-live event. */
export const UPCOMING_BROADCAST_STATUSES = new Set<BroadcastState>([
  'scheduled',
  'starting',
]);

/**
 * Parse an ISO timestamp into epoch milliseconds.
 *
 * Returns `null` for missing or unparseable values so callers can distinguish
 * "no time announced" from a real past/future instant. This is the only place
 * timestamps are interpreted, keeping the rest of the comparison logic numeric
 * and timezone-safe.
 */
export function broadcastInstant(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Whether a scheduled broadcast's start time has already passed.
 *
 * Only meaningful for broadcasts whose persisted status is still `scheduled`
 * (a `starting`/`live` broadcast is genuinely underway even if it began late).
 * Uses epoch comparison so a broadcast scheduled for a different timezone is
 * judged correctly regardless of the viewer's locale.
 */
export function isOverdueBroadcast(
  status: BroadcastState,
  scheduledStartAt: string | null,
  now: number = Date.now(),
): boolean {
  if (status !== 'scheduled') return false;
  const instant = broadcastInstant(scheduledStartAt);
  if (instant === null) return false;
  return instant <= now;
}

/**
 * Whether a broadcast should be presented as a normal future upcoming event.
 *
 * A `scheduled` broadcast whose start time has passed is *not* upcoming: it is
 * overdue. `starting` broadcasts are still upcoming until the audio path is
 * ready, because they have not reached the playable `live`/`reconnecting`
 * states yet.
 */
export function isFutureUpcomingBroadcast(
  status: BroadcastState,
  scheduledStartAt: string | null,
  now: number = Date.now(),
): boolean {
  if (status === 'starting') return true;
  if (status !== 'scheduled') return false;
  return !isOverdueBroadcast(status, scheduledStartAt, now);
}

/** Whether a broadcast is currently playable for listeners. */
export function isPlayableBroadcast(status: BroadcastState): boolean {
  return PLAYABLE_BROADCAST_STATUSES.has(status);
}

/**
 * Derived presentation status shown to listeners and creators.
 *
 * `overdue` is a *derived* presentation state only; the persisted database
 * status remains `scheduled`. This avoids introducing a new database enum or
 * lifecycle status while still giving creators and listeners an honest signal
 * that the scheduled start time has passed without the broadcast starting.
 */
export type BroadcastPresentationStatus =
  | BroadcastState
  | 'overdue';

export function presentationStatus(
  status: BroadcastState,
  scheduledStartAt: string | null,
  now: number = Date.now(),
): BroadcastPresentationStatus {
  if (isOverdueBroadcast(status, scheduledStartAt, now)) return 'overdue';
  return status;
}

/** A short, human-readable label for a derived presentation status. */
export function presentationLabel(status: BroadcastPresentationStatus): string {
  if (status === 'overdue') return 'Overdue';
  if (status === 'live') return 'Live now';
  if (status === 'reconnecting') return 'Reconnecting';
  if (status === 'starting') return 'Starting';
  if (status === 'ending') return 'Ending';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'failed') return 'Failed';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'draft') return 'Draft';
  return status;
}
