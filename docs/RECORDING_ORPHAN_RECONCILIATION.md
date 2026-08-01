# Recording object orphan reconciliation

This Phase 8 slice reconciles objects under the private `recordings/` storage prefix with the PostgreSQL recording ledger.

## Purpose

An object is an orphan candidate only when its storage key is absent from every recording row. The system must not delete an unknown object immediately because a database transaction, worker retry or storage listing can race with reconciliation.

The workflow therefore uses two explicit stages:

1. **Quarantine:** move an old unknown object out of the live recording prefix and record the operation in PostgreSQL.
2. **Cleanup:** after a second grace period, recheck the database. Delete the quarantined object only when the original key is still unknown. Restore it when a recording row now owns the key.

## Safety boundaries

- Reconciliation routes are internal and require the media-control secret.
- Storage inventory is bounded and cursor-paginated.
- Objects with no trustworthy last-modified timestamp are not moved.
- Production quarantine requires an object to be at least five minutes old; the default is 24 hours.
- Production cleanup waits at least 24 hours after quarantine; the default is seven days.
- The object size is checked before and after a quarantine move.
- Database ownership is checked before moving an object and again immediately after the move.
- A recording row that appears during the race window causes immediate restoration.
- Quarantine and cleanup claims use durable states and stale-claim recovery.
- Failed attempts retain an error and are retryable; the ledger is never silently discarded.

## Internal API

### Scan and quarantine one storage page

`POST /api/v1/internal/recording-orphans/reconcile`

```json
{
  "action": "quarantine",
  "limit": 50,
  "cursor": null,
  "minimumAgeSeconds": 86400,
  "quarantineSeconds": 604800
}
```

The response reports known objects, recent objects, objects with unverifiable age, newly quarantined objects, race-matched objects, failures and the next storage cursor.

### Clean due quarantine records

`POST /api/v1/internal/recording-orphans/reconcile`

```json
{
  "action": "cleanup",
  "limit": 50
}
```

Due records are deleted only after the database ownership check. A newly owned key is restored to its original path instead.

### Inspect the durable ledger

`GET /api/v1/internal/recording-orphans?limit=50`

The ledger exposes internal storage keys and therefore uses the same media-control authentication boundary.

## Storage abstraction

The object-storage adapter now supports optional bounded inventory and verified move operations. S3-compatible storage uses `ListObjectsV2`, server-side copy, destination metadata verification and source deletion. The in-memory adapter implements the same behavior for integration tests.

Providers that do not implement inventory and move capabilities fail closed with `OBJECT_STORAGE_INVENTORY_UNAVAILABLE`.

## Validation gate

This pull request remains draft until it passes:

- migration and repository tests;
- known-object exclusion;
- unknown-object quarantine;
- cleanup after the quarantine grace period;
- restoration when a recording row appears after quarantine;
- unauthorized internal-route rejection;
- stale claim and idempotent move behavior;
- Node 22 and Node 24 typecheck, full API tests and production builds;
- S3-compatible CI storage validation.
