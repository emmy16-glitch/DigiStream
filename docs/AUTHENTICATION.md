# DigiStream authentication

DigiStream uses one creator session across the dashboard, Broadcast Studio, Backstage and authenticated listener routes. Feature dialogs do not create separate accounts or independent sessions.

## Supported account methods

### Email

Creators can:

- create an account with display name, email and a 12–128 character password;
- sign in with email and password;
- sign out from the creator workspace;
- continue using the HttpOnly session across creator features.

New email accounts receive the platform `broadcaster` capability so first-time onboarding can create an organisation. Organisation and channel authorization still remains server-side.

### Google

Google Identity Services is optional per environment.

The browser receives only the configured Google web client ID. Google returns a signed ID token to the browser, and DigiStream sends that token plus a cryptographic nonce to the API. The API then:

1. downloads and caches Google public signing keys;
2. verifies the RS256 signature;
3. validates issuer, audience, expiry, issued-at time and nonce;
4. requires a Google-verified email address;
5. creates or links a DigiStream user identity;
6. grants or restores creator capability;
7. creates the normal DigiStream HttpOnly session.

DigiStream never treats unverified browser profile data as authentication. A Google client secret is not shipped to the web application.

## Google configuration

Create an OAuth 2.0 **Web application** client in Google Cloud and configure each browser origin that will display the Google button.

Set the web client ID in the API environment:

```bash
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

For local browser development, authorize:

```text
http://localhost:5173
```

For a Codespace, authorize the exact forwarded web origin currently shown in the browser, for example:

```text
https://your-codespace-name-5173.app.github.dev
```

Codespace hostnames can change when a Codespace is recreated. Add the current exact origin rather than relying on a wildcard.

When `GOOGLE_CLIENT_ID` is blank, the API reports Google authentication as unavailable and the UI keeps email registration and login enabled. It does not render a fake working Google button.

## Development request routing

The browser uses same-origin `/api` requests by default. Vite proxies HTTP and WebSocket traffic to the API on port `3000`:

```text
browser on forwarded port 5173
  -> /api/...
Vite development proxy
  -> http://127.0.0.1:3000/api/...
```

This prevents a phone browser from interpreting `localhost:3000` as the phone itself and keeps session cookies on the web origin.

Leave this blank during normal Vite development:

```bash
VITE_API_URL=
```

A production deployment may set `VITE_API_URL` only when the API is intentionally hosted on a different origin and the complete cookie, CORS and WebSocket policies are configured for that deployment.

## Database migration

Google identity links are stored in `auth_identities` through:

```text
0011_google_auth_identities.sql
```

Apply migrations before starting the API:

```bash
npm run db:migrate
```

## Security boundaries

- Session cookies are opaque and HttpOnly.
- Passwords use the existing scrypt hashing implementation.
- Google identity tokens are verified by the API, not trusted from decoded browser claims.
- Provider subject identifiers are unique per provider.
- A verified matching email can link Google to an existing DigiStream account.
- Disabled users cannot create a Google session.
- Organisation roles and resource authorization remain independent of the login provider.
- Google public signing keys are fetched with a bounded timeout and cached using the provider cache lifetime.

## First-time creator flow

```text
Create account with email or Google
  -> secure DigiStream session
  -> create first organisation
  -> create or select a channel
  -> create or select a broadcast
  -> test microphone
  -> join private studio
  -> verify public delivery
```
