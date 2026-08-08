# Channel moderation and retention

Channel moderation is part of the Phase 4 channel owner; it does not introduce a separate discovery or authorization path.

## Authority

Organisation owners, administrators and moderators may suspend or restore an active channel through the authenticated organisation-scoped moderation route. Broadcasters and analysts cannot moderate. Cross-tenant callers receive the existing private not-found behaviour.

Only organisation owners and administrators may soft-delete or restore a retained channel.

## Lifecycle truth

Suspension is only valid from `active` and restoration is only valid from `suspended`. Repeated suspension/restoration requests are idempotent when the requested state is already true.

Soft deletion moves the channel to `archived`, records the authenticated actor and bounded reason, sets `deleted_at`, and assigns a fixed 30-day `retention_until` timestamp. Normal organisation reads, exact public routes and public discovery exclude deleted rows immediately.

A retained channel may be restored by an owner or administrator before `retention_until`. Restoration clears the deletion/retention markers and returns the channel to `draft`; it never silently republishes a previously public channel. After the retention deadline the restore API rejects recovery. Retained rows remain unavailable to product surfaces unless a separately reviewed purge/reconciliation process removes them.

## Evidence and privacy

Moderation metadata records only the acting user id, timestamp and a bounded reason. Public channel DTOs do not expose moderation reasons or deleted channel metadata. Duplicate soft-delete calls keep the original deletion timestamp and retention deadline rather than extending the window.

## Verification

Integration coverage must exercise authentication, private-not-found tenant isolation, role rejection, suspension/restoration, public hiding, duplicate requests, retained deletion, search hiding and safe draft restoration.
