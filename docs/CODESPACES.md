# Developing DigiStream from a phone with Codespaces

DigiStream can be developed from an Android phone while remaining one responsive web platform for mobile, tablet and desktop users.

GitHub Codespaces supplies the Linux development computer. A phone may use the browser editor or connect from Termux with GitHub CLI over SSH.

## Create the Codespace

1. Open the DigiStream repository on GitHub.
2. Select the branch you intend to test.
3. Open **Code**, then **Codespaces**.
4. Create a Codespace for that branch.
5. Open the normal mobile site first. Use Chrome **Desktop site** only when deliberately checking the desktop layout.

The repository's `.devcontainer/devcontainer.json` configures Node.js 22, enables SSH, runs `.devcontainer/post-create.sh` and forwards the API and web ports.

The post-create script installs PostgreSQL inside the Codespace, creates the local `digistream` role and database, creates `.env` when it is missing, installs workspace dependencies and applies all migrations. Docker is not required for ordinary API and web development inside this Codespace.

## Connect from Termux

Install and authenticate GitHub CLI in Termux, then list and connect to the Codespace:

```bash
gh auth status
gh codespace list -R emmy16-glitch/DigiStream
gh codespace ssh -c <codespace-name>
```

The devcontainer must have been rebuilt after the SSH feature was added. An older Codespace created before that change may need to be deleted and recreated.

## Confirm the environment

After the post-create command finishes, run:

```bash
cd /workspaces/DigiStream
pwd
git status
git branch --show-current
node --version
npm --version
ls -la .env node_modules
```

For pull request 29, the expected branch is:

```text
agent/broadcast-studio-ui
```

A healthy setup ends with:

```text
[DigiStream] Codespace setup is complete.
```

## Recover an interrupted setup

A Codespace can stop while packages or migrations are being prepared. Restart the setup from the repository root:

```bash
cd /workspaces/DigiStream
bash .devcontainer/post-create.sh
```

Do not run `docker compose` merely to obtain PostgreSQL in the normal Codespace. The current devcontainer installs PostgreSQL directly. The complete LiveKit, Egress and OvenMediaEngine stack still requires a Docker-capable environment as described in `LOCAL_MEDIA_STACK.md`.

## Run DigiStream

Load the development environment and start the API:

```bash
cd /workspaces/DigiStream
set -a
source .env
set +a
npm run dev:api
```

In a second Termux session, reconnect to the same Codespace and start the web application:

```bash
cd /workspaces/DigiStream
set -a
source .env
set +a
npm run dev:web
```

Codespaces forwards:

- `3000` — DigiStream API;
- `5173` — DigiStream web application.

Open the forwarded `5173` URL in Chrome. The browser should use only the web URL. Vite proxies `/api` and `/api/v1/realtime` to port `3000`, so the phone does not try to contact its own `localhost:3000`.

A quick health check from the Codespace terminal is:

```bash
curl -fsS http://127.0.0.1:5173/api/v1/status
```

A healthy signed-out creator page should show email authentication without a yellow **API unavailable** badge or a generic **Failed to fetch** alert.

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

Do not put a Google client secret in the web application. See `AUTHENTICATION.md`.

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

The pull-request workflow also runs responsive Playwright checks for desktop Chromium, Android Chrome and Android Desktop-site simulation.

## Save Codespaces allowance

Stop the Codespace when work is finished. Delete obsolete Codespaces after confirming that every needed change was pushed to GitHub.
