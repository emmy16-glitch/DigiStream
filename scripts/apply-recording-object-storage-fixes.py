from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    content = file.read_text()
    if old not in content:
        raise SystemExit(f"Expected text was not found in {path}")
    file.write_text(content.replace(old, new, 1))
    print(f"updated {path}")


replace(
    "apps/api/src/modules/recordings/recordings.service.ts",
    "url: `/api/v1/recording-media/${encodeURIComponent(minted.token)}`",
    "url: `/api/v1/recording-media?token=${encodeURIComponent(minted.token)}`",
)

replace(
    "apps/api/src/modules/recordings/recordings.routes.ts",
    """  app.get<{
    Params: { token: string };
    Headers: { range?: string };
  }>('/api/v1/recording-media/:token', async (request, reply) => {
    const context = requireDatabase(database);
    const result = await resolveRecordingMedia(
      context.db,
      requireObjectStorage(options.objectStorage),
      requireAccessManager(options.accessManager),
      request.params.token,
      request.headers.range,
    );""",
    """  app.get<{
    Querystring: { token?: string };
    Headers: { range?: string };
  }>('/api/v1/recording-media', async (request, reply) => {
    if (typeof request.query.token !== 'string' || request.query.token.length === 0) {
      throw new ApiError(
        401,
        'RECORDING_ACCESS_INVALID',
        'Valid recording access is required.',
      );
    }
    const context = requireDatabase(database);
    const result = await resolveRecordingMedia(
      context.db,
      requireObjectStorage(options.objectStorage),
      requireAccessManager(options.accessManager),
      request.query.token,
      request.headers.range,
    );""",
)

replace(
    "apps/api/test/recordings.integration.test.ts",
    "assert.ok(playbackUrl.startsWith('/api/v1/recording-media/'));",
    "assert.ok(playbackUrl.startsWith('/api/v1/recording-media?token='));",
)

print("recording object storage validation fixes applied")
