# Public profiles and platform capabilities

This backend slice separates a user's private authentication account from the identity that other DigiStream users may view.

## Data model

### `user_profiles`

A profile belongs to exactly one user and contains:

- a unique normalized username
- a public biography
- a discoverability preference
- profile creation and update timestamps

Email addresses, password hashes, account status, sessions and administrator authority are never returned by the public profile endpoint.

### `user_platform_capabilities`

Platform authority is separate from organisation membership roles.

Supported capabilities are:

- `broadcaster`: the user may later receive creator publishing access
- `platform_admin`: the user may perform platform-wide administration

Capability rows are revocable and record who granted the authority. Organisation roles such as owner, admin, broadcaster, moderator and analyst remain scoped to one organisation and do not grant platform-wide access.

## Endpoints

### Current user's private profile

```text
GET /api/v1/profile
```

Requires an authenticated database session. Returns the private account projection, optional public-profile fields and active platform capabilities.

### Create or replace the current user's public profile

```text
PUT /api/v1/profile
```

Example body:

```json
{
  "username": "example_creator",
  "displayName": "Example Creator",
  "biography": "Live audio creator and host.",
  "isDiscoverable": true
}
```

Usernames are normalized to lowercase, limited to 3–30 letters, numbers or underscores, checked against reserved route names and protected by a unique PostgreSQL constraint.

### Public profile

```text
GET /api/v1/profiles/:username
```

This endpoint is anonymous. It returns only discoverable profiles belonging to active users. Missing, hidden and unavailable profiles all use the same not-found response so private account state is not disclosed.

### Grant a platform capability

```text
PUT /api/v1/admin/users/:userId/capabilities/:capability
```

### Revoke a platform capability

```text
DELETE /api/v1/admin/users/:userId/capabilities/:capability
```

Both administration endpoints require an authenticated user with an active `platform_admin` capability. A platform administrator cannot revoke their own administrator authority through the API.

## Initial administrator bootstrap

The first platform administrator is an operational bootstrap action, not a public registration feature. Until a dedicated operator CLI is added, it should be inserted directly by an authorised database operator after the user account exists.

Public registration never grants `platform_admin` automatically.

## Security rules

- Public DTOs never contain email addresses, account status or private capabilities.
- Hidden profiles return the same response as nonexistent profiles.
- Capability changes are authorised using current server-side database state.
- Capability grants are unique per user and capability and may be reactivated safely.
- Revocations remain recorded instead of deleting the authority history.
- Session cookies remain the only browser authentication mechanism.
- Validation, conflicts and authorization failures use the standard request-ID error envelope.
