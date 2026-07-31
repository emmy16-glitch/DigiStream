# Developing DigiStream from a phone with Codespaces

DigiStream can be developed from an Android phone while remaining a responsive web platform for mobile, tablet and desktop users.

GitHub Codespaces supplies the Linux development computer. The phone only needs a browser.

## Create the Codespace

1. Open the DigiStream repository on GitHub.
2. Select the branch you intend to test.
3. Open **Code**, then **Codespaces**.
4. Create a Codespace for that branch.
5. Open the normal mobile site first. Use Chrome **Desktop site** only when deliberately checking the desktop layout.

The repository's `.devcontainer/devcontainer.json` configures Node.js 22, installs dependencies and forwards the API and web ports.

## Confirm the environment

Open a terminal and run:

```bash
pwd
git status
git branch --show-current
node --version
npm --version
```

For pull request 29, the expected branch is:

```text
agent/broadcast-studio-ui
```

## Prepare the application

Create the local environment file:

```bash
cp -n .env.example .env
```

Start PostgreSQL inside the Codespace:

```bash
docker compose -f compose.media.yml up -d postgres
```

Apply all migrations:

```bash
npm run db:migrate
```

The authentication migration must include:

```text
0011_google_auth_identities.sql
```

## Run DigiStream

Start the API in one terminal:

```bash
npm run dev:api
```

Wait until the API reports that it is listening on port `3000`.

Start the web application in another terminal:

```bash
npm run dev:web
```

Codespaces forwards these ports automatically:

- `3000` — DigiStream API;
- `5173` — DigiStream web application.

Open the forwarded `5173` port. The browser should use only the web URL. The Vite development server proxies `/api` and `/api/v1/realtime` to port `3000`, so the phone no longer tries to contact its own `localhost:3000`.

A healthy signed-out creator page should show:

- **Sign in** and **Create account** tabs;
- email authentication;
- Google authentication only when `GOOGLE_CLIENT_ID` is configured;
- no yellow **API unavailable** badge;
- no generic **Failed to fetch** alert.

## Optional Google sign-in

Email registration and login work without Google configuration.

To enable the real Google button:

1. Create a Google OAuth 2.0 web client.
2. Add the exact forwarded Codespace web origin as an authorized JavaScript origin.
3. Set the client ID in `.env`:

```bash
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

4. Restart the API.
5. Reload the web page.

Do not put a Google client secret in the web application. See [`AUTHENTICATION.md`](AUTHENTICATION.md).

## Responsive visual checks

Use the forwarded `5173` page and test:

- normal phone portrait;
- normal phone landscape;
- Chrome Desktop site only as a desktop approximation;
- desktop browser widths when available.

For the Broadcast Studio, verify that phone landscape becomes a full-height control surface with a compact header and internally scrollable content.

## Validate before committing

```bash
npm run check
```

This runs TypeScript checks, API tests and production builds.

## Work on a feature branch

```bash
git switch main
git pull origin main
git switch -c feature/short-feature-name
```

After making changes:

```bash
git status
git add <changed-files>
git commit -m "Describe the change"
git push -u origin feature/short-feature-name
```

Open a pull request and wait for GitHub Actions to finish before merging.

## Update after a pull request is merged

```bash
git switch main
git pull origin main
```

## Save Codespaces allowance

Stop the Codespace when you finish working. Delete old Codespaces when their files are no longer needed.
