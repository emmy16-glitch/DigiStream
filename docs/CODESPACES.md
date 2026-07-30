# Developing DigiStream from a phone with Codespaces

DigiStream can be developed from an Android phone while remaining a responsive web platform for mobile, tablet and desktop users.

GitHub Codespaces supplies the Linux development computer. The phone only needs a browser.

## Create the Codespace

1. Open the DigiStream repository on GitHub.
2. Select the branch you intend to test.
3. Open **Code**, then **Codespaces**.
4. Create a Codespace for that branch.
5. In Chrome on Android, enable **Desktop site** and use landscape mode when useful.

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

## Run DigiStream

Start the API in one terminal:

```bash
npm run dev:api
```

Start the web application in another terminal:

```bash
npm run dev:web
```

Codespaces forwards these ports automatically:

- `3000` — DigiStream API
- `5173` — DigiStream web application

Open the forwarded `5173` port to inspect the interface. The web application is responsive, so use the browser's device toolbar or resize the window to check mobile, tablet and desktop layouts.

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
