from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise SystemExit(f"Expected text was not found in {path}: {old[:80]!r}")
    file.write_text(content.replace(old, new, 1))
    print(f"updated {path}")


replace_once(
    "apps/api/src/app.ts",
    "import { registerRecordingRoutes } from './modules/recordings/recordings.routes.js';",
    "import { registerRecordingJobRoutes } from './modules/recordings/recording-jobs.routes.js';\n"
    "import { registerRecordingRoutes } from './modules/recordings/recordings.routes.js';",
)

replace_once(
    "apps/api/src/app.ts",
    """  registerRecordingRoutes(app, database, mediaControlSecret, {
    objectStorage,
    accessManager: recordingAccessManager,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerBroadcastRoutes(""",
    """  registerRecordingRoutes(app, database, mediaControlSecret, {
    objectStorage,
    accessManager: recordingAccessManager,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerRecordingJobRoutes(app, database, mediaControlSecret, {
    objectStorage,
    maxUploadBytes: recordingUploadMaxBytes,
  });
  registerBroadcastRoutes(""",
)

replace_once(
    "apps/api/src/app.ts",
    "stage: 'recording-object-storage',",
    "stage: 'recording-reconciliation',",
)

replace_once(
    "apps/api/src/app.ts",
    """      'recording-object-storage',
      'verified-recording-artifact-upload',""",
    """      'recording-object-storage',
      'database-backed-recording-job-queue',
      'exclusive-recording-worker-leases',
      'recording-job-heartbeats',
      'recording-retry-backoff',
      'recording-job-reconciliation',
      'verified-recording-artifact-upload',""",
)

replace_once(
    "apps/api/test/health.test.ts",
    "assert.equal(response.json().stage, 'recording-object-storage');",
    "assert.equal(response.json().stage, 'recording-reconciliation');",
)

replace_once(
    "apps/api/test/health.test.ts",
    """  assert.ok(response.json().capabilities.includes('recording-object-storage'));
  assert.ok(""",
    """  assert.ok(response.json().capabilities.includes('recording-object-storage'));
  assert.ok(
    response.json().capabilities.includes('database-backed-recording-job-queue'),
  );
  assert.ok(
    response.json().capabilities.includes('exclusive-recording-worker-leases'),
  );
  assert.ok(
    response.json().capabilities.includes('recording-job-reconciliation'),
  );
  assert.ok(""",
)

replace_once(
    "apps/api/src/modules/recordings/recording-jobs.service.ts",
    """import {
  uploadRecordingArtifact,
  type RecordingArtifactUploadInput,
} from './recordings.service.js';""",
    """import {
  updateRecordingFromWorker,
  uploadRecordingArtifact,
  type RecordingArtifactUploadInput,
} from './recordings.service.js';""",
)

replace_once(
    "apps/api/src/modules/recordings/recording-jobs.service.ts",
    """  await requireLease(db, jobId, workerId, leaseToken);
  const result = await failRecordingProcessingJob(db, {""",
    """  const lease = await requireLease(db, jobId, workerId, leaseToken);
  await updateRecordingFromWorker(
    db,
    lease.organisationId,
    lease.recordingId,
    {
      status: 'failed',
      provider: 'recording-job-worker',
      providerArtifactId: null,
      mediaFormat: null,
      contentType: null,
      sizeBytes: null,
      durationMs: null,
      checksumSha256: null,
      processingError: failureMessage,
    },
  );
  const result = await failRecordingProcessingJob(db, {""",
)

roadmap = Path("docs/ROADMAP.md")
roadmap_content = roadmap.read_text()
for old, new in [
    ("- [ ] Add private object storage and generated storage keys", "- [x] Add private object storage and generated storage keys"),
    ("- [ ] Add recording states: recording, uploading, processing, ready, failed, published, private, archived and deleted", "- [x] Add recording states: recording, uploading, processing, ready, failed, published, private, archived and deleted"),
    ("- [ ] Add retry-safe processing jobs and reconciliation", "- [x] Add retry-safe processing jobs and reconciliation"),
    ("- [ ] Add checksums, duration, size, format and processing errors", "- [x] Add checksums, duration, size, format and processing errors"),
    ("- [ ] Add independent playback and download authorization", "- [x] Add independent playback and download authorization"),
    ("- [ ] Add HTTP range playback through the delivery path", "- [x] Add HTTP range playback through the delivery path"),
]:
    if old not in roadmap_content:
        raise SystemExit(f"Expected roadmap item was not found: {old}")
    roadmap_content = roadmap_content.replace(old, new, 1)
roadmap.write_text(roadmap_content)
print("updated docs/ROADMAP.md")

replace_once(
    "docs/RECORDING_FOUNDATION.md",
    """## Next implementation slice

The next recording slice should add a provider-neutral object-storage interface, a local S3-compatible development service, a worker adapter that uploads an actual audio artifact, checksum verification after upload, and short-lived authorized playback/download access. Only then should the listener Replay page expose a playable control.""",
    """## Subsequent implementation slices

The private object-storage, verified upload, authorised delivery and database-backed recording-job reconciliation slices are now implemented on stacked draft branches. Remaining Phase 8 work includes retention and deletion policy, legal/moderation holds, orphan cleanup and public listener replay pages. Replay navigation must remain gated until the complete authorised listener flow and failure states are verified.""",
)

print("recording reconciliation wiring applied")
