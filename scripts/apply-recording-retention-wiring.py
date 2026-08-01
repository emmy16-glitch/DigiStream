from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise SystemExit(f"Expected text was not found in {path}: {old[:100]!r}")
    file.write_text(content.replace(old, new, 1))
    print(f"updated {path}")


replace_once(
    "apps/api/src/app.ts",
    "import { registerRecordingJobRoutes } from './modules/recordings/recording-jobs.routes.js';\nimport { registerRecordingRoutes } from './modules/recordings/recordings.routes.js';",
    "import { registerRecordingJobRoutes } from './modules/recordings/recording-jobs.routes.js';\n"
    "import { registerRecordingRetentionRoutes } from './modules/recordings/recording-retention.routes.js';\n"
    "import { registerRecordingRoutes } from './modules/recordings/recordings.routes.js';",
)

replace_once(
    "apps/api/src/app.ts",
    """  registerRecordingJobRoutes(app, database, mediaControlSecret, {
    objectStorage,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerBroadcastRoutes(""",
    """  registerRecordingJobRoutes(app, database, mediaControlSecret, {
    objectStorage,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerRecordingRetentionRoutes(app, database, mediaControlSecret, {
    objectStorage,
  });
  registerBroadcastRoutes(""",
)

replace_once(
    "apps/api/src/app.ts",
    "stage: 'recording-reconciliation',",
    "stage: 'recording-retention',",
)

replace_once(
    "apps/api/src/app.ts",
    """      'recording-job-reconciliation',
      'verified-recording-artifact-upload',""",
    """      'recording-job-reconciliation',
      'recording-retention-controls',
      'recording-legal-and-moderation-holds',
      'recording-protected-deletion-scheduling',
      'recording-cleanup-reconciliation',
      'verified-recording-artifact-upload',""",
)

replace_once(
    "apps/api/test/health.test.ts",
    "assert.equal(response.json().stage, 'recording-reconciliation');",
    "assert.equal(response.json().stage, 'recording-retention');",
)

replace_once(
    "apps/api/test/health.test.ts",
    """  assert.ok(
    response.json().capabilities.includes('recording-job-reconciliation'),
  );
  assert.ok(
    response.json().capabilities.includes('verified-recording-artifact-upload'),
  );""",
    """  assert.ok(
    response.json().capabilities.includes('recording-job-reconciliation'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-retention-controls'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-legal-and-moderation-holds'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-cleanup-reconciliation'),
  );
  assert.ok(
    response.json().capabilities.includes('verified-recording-artifact-upload'),
  );""",
)

replace_once(
    "docs/ROADMAP.md",
    "- [ ] Add retry-safe processing jobs and reconciliation",
    "- [x] Add retry-safe processing jobs and reconciliation",
)

replace_once(
    "docs/ROADMAP.md",
    "- [ ] Add retention, deletion, legal/moderation hold and orphan cleanup",
    "- [x] Add retention, deletion and legal/moderation hold controls with protected cleanup\n"
    "- [ ] Add object-store orphan listing, quarantine and cleanup",
)

foundation = Path("docs/RECORDING_FOUNDATION.md")
foundation_content = foundation.read_text()
marker = "## Deliberately not implemented yet"
if marker not in foundation_content:
    raise SystemExit("Expected recording foundation marker was not found")
foundation_prefix = foundation_content.split(marker, 1)[0].rstrip()
foundation_tail = """
## Implemented durable processing and retention slices

- PostgreSQL-backed processing jobs with atomic `FOR UPDATE SKIP LOCKED` claims.
- Short-lived worker leases, heartbeats, bounded exponential retries and dead-letter state.
- Reconciliation for expired leases and recordings already in terminal artifact states.
- One retention-control row per recording with migration backfill.
- Explicit deletion scheduling with a minimum grace period and immediate archive-based access revocation.
- Legal and moderation holds that prevent destructive cleanup.
- Protected, bounded cleanup reconciliation with checksum verification, honest missing-object outcomes and idempotent completion.

The worker lifecycle is documented in [`RECORDING_RECONCILIATION.md`](RECORDING_RECONCILIATION.md). Retention and cleanup are documented in [`RECORDING_RETENTION.md`](RECORDING_RETENTION.md).

## Deliberately not implemented yet

- Listing and quarantining object-store keys that have no database record.
- Organisation-wide default retention policies.
- Public listener replay pages and published replay discovery.
- Production object-storage backup, lifecycle and disaster-recovery policy.
- Direct browser-to-storage multipart upload; uploads remain behind the trusted API boundary.

## Next implementation slice

The next Phase 8 slice should add public and member replay listening pages only after the complete authorised playback, expiry, archived-state and failure behaviour is represented honestly. Object-store orphan discovery and quarantine remains a separate operational slice.
"""
foundation.write_text(foundation_prefix + "\n\n" + foundation_tail.lstrip())
print("updated docs/RECORDING_FOUNDATION.md")

print("recording retention wiring applied")
