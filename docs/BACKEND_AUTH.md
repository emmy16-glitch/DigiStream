# DigiStream backend authentication

## Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

Registration accepts `email`, `displayName` and `password`. Login accepts `email` and `password`. Passwords must contain 12–128 characters.

## Password storage

Passwords are hashed with Node.js `scrypt` using a random 16-byte salt. The stored value records the algorithm and work parameters so stronger settings can be introduced later. Plain-text passwords are never written to PostgreSQL or returned by the API.

## Sessions

Successful registration and login generate a random 256-bit token. The browser receives the token in an `HttpOnly`, `SameSite=Lax` cookie. PostgreSQL stores only a SHA-256 hash of the token.

Sessions include expiration, last-use, revocation, user-agent and IP metadata. Logout revokes the database record and expires the browser cookie. Expired, revoked and suspended-user sessions are rejected by `/api/v1/auth/me`.

In production, set:

```env
AUTH_COOKIE_SECURE=true
```

and serve the API through HTTPS.

## Local use

Apply migrations before starting the API:

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run dev:api
```

Example registration body:

```json
{
  "email": "creator@example.com",
  "displayName": "Example Creator",
  "password": "A-long-unique-password"
}
```

## Deliberately separate follow-up work

Email verification, password reset, multi-factor authentication, distributed login rate limiting and organisation permissions are separate backend slices. They should not be mixed into the first session implementation.
