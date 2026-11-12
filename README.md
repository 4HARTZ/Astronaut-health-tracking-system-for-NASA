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

Records remain unencrypted in browser localStorage. Use synthetic data in development. There is no authentication, backend, cloud synchronization, or production security. Clearing browser data removes records. The app uses no external runtime assets, but installable offline support is not implemented.

## Manual acceptance

Save partial measurements, reload to confirm persistence, cancel and save edits, confirm/cancel deletion, import an old export twice, reject malformed JSON, inspect charts and filters, export JSON, navigate by keyboard, and inspect a narrow viewport. Confirm a blocked/full storage error preserves inputs.

## Next steps

1. Measurement guidance and daily checklists.
2. Installable offline app support.
3. Printable reports and optional chart comparisons.
4. Identity, encryption, privacy, and sharing requirements.
5. Medically reviewed baseline and escalation protocols.
