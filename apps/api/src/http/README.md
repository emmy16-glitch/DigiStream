# Shared HTTP conventions

This directory contains cross-cutting API behaviour used by every backend module.

Current conventions:

- Every response includes `x-request-id` for correlation.
- Not-found responses use the standard API error envelope.
- Expected `ApiError` failures preserve their safe public code and message.
- Unexpected failures are logged with their request ID and return a generic message.
- Internal stack traces, database messages, credentials and secrets are never returned.

New route modules should throw `ApiError` for expected failures instead of constructing unrelated error shapes.
