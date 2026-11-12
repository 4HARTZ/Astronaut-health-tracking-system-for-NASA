# Orbit — Astronaut health check-in

A React + Vite web-app prototype by team **4HARTZ**. Record basic health indicators, review trends, edit records, and import/export backups.

## Run locally

Requires Node.js 22.12 or newer (Node 22 LTS recommended) and npm.

```powershell
npm ci
npm run dev
```

Open http://localhost:8080. Stop the server with Ctrl+C. Vite uses strict port 8080 to preserve the original app's browser storage address; stop an older Python server first if that port is occupied. The Python command no longer runs the source app because JSX needs Vite's transformation.

## Existing records and backups

The migration preserves the `orbit-health-v1` localStorage key, record fields, and version 1 JSON export format. Existing records load automatically in the same browser profile at the same origin, such as `http://localhost:8080`. `localhost` and `127.0.0.1`, different ports, and different browsers have separate storage. Export from the old address and import at the new address if needed.

Imports accept version 1 Orbit JSON exports up to 5 MB and 10,000 records. The full backup is validated before saving. New IDs are merged; duplicate IDs with identical content are skipped; conflicts preserve existing records. Invalid saved data disables writes to avoid overwriting it. Saving failures preserve form input and existing data.

## Development commands

```powershell
npm test
npm run build
npm run preview
```

Tests use Node's test runner, React Testing Library, and jsdom. Build outputs production assets in `dist/`. Preview serves that build at http://localhost:8080 (stop the dev server first). Deploy `dist/` to static hosting; `npm run dev` is for local development. Commit `package-lock.json`; generated `dist/` and `node_modules/` are ignored.

## Project structure

- `src/main.jsx`: React entry point and styles.
- `src/App.jsx`: shared state, persistence, and record actions.
- `src/components/`: check-in form, metric cards, SVG chart, change summary, and history with backup controls.
- `src/health.js`: measurement definitions, validation, backup merging, storage helpers, and trend calculations.
- `src/styles.css`: responsive styling retained from the original app.
- `tests/`: data compatibility and React interaction tests.

## Features and limits

Record resting heart rate, paired blood pressure, temperature, sleep duration and quality, mood, stress, and symptom notes. Missing measurements remain missing. Edit or delete records from history; edits can be cancelled and deletion requires confirmation.

Charts filter by inclusive local dates and measurement context and show up to 100 recent available values per indicator, with dated text equivalents. What changed compares the most recent comparable pair per indicator in the same context. These observations do not infer causes or health status.

This is a prototype, not a medical device. Entry limits are not clinical thresholds. There are no diagnoses, treatment recommendations, health scores, medical alerts, or baseline assessments. Future medical rules require qualified mission medical review. Basic readings cannot assess bone density, radiation dose, or immune function.

Records remain unencrypted in browser localStorage. Use synthetic data in development. There is no authentication, backend, cloud synchronization, or production security. Clearing browser data removes records. The app uses no external runtime assets, and production builds support installation and offline app-shell caching.

## Manual acceptance

Save partial measurements, reload to confirm persistence, cancel and save edits, confirm/cancel deletion, import an old export twice, reject malformed JSON, inspect charts and filters, export JSON, navigate by keyboard, and inspect a narrow viewport. Confirm a blocked/full storage error preserves inputs.

## Next steps

1. Measurement guidance and daily checklists.
2. Installable offline app support.
3. Printable reports and optional chart comparisons.
4. Identity, encryption, privacy, and sharing requirements.
5. Medically reviewed baseline and escalation protocols.

## Guided daily workflow

Today’s checklist counts saved measurements using the device’s local calendar date. The four-step check-in covers preparation, body measurements, sleep/wellbeing, and review. Blank measurements remain optional; at least one reading or note is required. Back navigation preserves inputs, and records are written only on final save. A successful save shows the recorded values, missing indicators, and links to trends, correction, and backup actions. Editing remains a single form. Drafts are held in memory and are lost if the page is refreshed.

## Install and use offline

Offline caching is enabled only in production builds. Run:

```powershell
npm run build
npm run preview
```

Stop any dev server occupying port 8080 first. Open http://localhost:8080 in Chrome or Edge and wait for **Ready for offline use on this device**. Use the browser address-bar installation icon or its **Install app** menu. An **Install Orbit** button appears when the browser provides an installation prompt. On iPhone/iPad use Safari's Share → Add to Home Screen. The embedded preview may not support installation. Hosted deployments require HTTPS; localhost is supported for local testing.

After the first successful setup, the cached production app can reopen at the same address with no server or internet connection. Measurements, history, edits, charts, and JSON backups remain local and usable offline. External research pages still need connectivity. The connection indicator reflects the device's network signal, not proof that the server is reachable. Browsers may evict cached files or local data; exports are still necessary for backups.

New builds install in the background. **Update ready — reload** asks you to finish/save work before activating and reloading. No automatic reload interrupts a check-in. Other open windows receive a notice when a new worker takes control and can reload after saving. Updates cache public application files only; health data remains in localStorage and is never cached as a network response or uploaded.

### Verify locally

1. Build and preview; open once and wait for the ready message.
2. Install using the browser menu if available.
3. Stop the preview server (Ctrl+C), then reload the same address or reopen the installed app.
4. With synthetic data, complete a check-in, view charts, edit a record, and export a backup while the server is stopped. Reload again and verify persistence.
5. Restart preview to receive updates. Finish any draft before applying them.

For development after testing offline: open browser DevTools → Application → Service Workers and unregister Orbit's worker, then start `npm run dev`. Avoid **Clear site data**, which also deletes health records. The existing production worker can otherwise keep serving its cached release instead of your development code.
