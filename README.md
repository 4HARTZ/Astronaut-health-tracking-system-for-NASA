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

The app migrates the `orbit-health-v1` localStorage records into the local-only workspace in the `orbit-v2` IndexedDB database. Record fields and version 1 JSON backups remain compatible. Existing records migrate automatically in the same browser profile at the same origin, such as `http://localhost:8080`. `localhost` and `127.0.0.1`, different ports, and different browsers have separate storage. Export from the old address and import at the new address if needed.

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

Records and the local change journal remain unencrypted in IndexedDB. The original localStorage array is retained as a migration backup. Use synthetic data in development. There is no authentication, backend, cloud synchronization, or production security. Clearing browser data removes records. The app uses no external runtime assets, and production builds support installation and offline app-shell caching.

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

New builds install in the background. **Update ready — reload** asks you to finish/save work before activating and reloading. No automatic reload interrupts a check-in. Other open windows receive a notice when a new worker takes control and can reload after saving. Updates cache public application files only; health data remains in device storage and is never cached as a network response or uploaded.

### Verify locally

1. Build and preview; open once and wait for the ready message.
2. Install using the browser menu if available.
3. Stop the preview server (Ctrl+C), then reload the same address or reopen the installed app.
4. With synthetic data, complete a check-in, view charts, edit a record, and export a backup while the server is stopped. Reload again and verify persistence.
5. Restart preview to receive updates. Finish any draft before applying them.

For development after testing offline: open browser DevTools → Application → Service Workers and unregister Orbit's worker, then start `npm run dev`. Avoid **Clear site data**, which also deletes health records. The existing production worker can otherwise keep serving its cached release instead of your development code.

## Readable health reports

Use **Health report** below the history, or **Prepare report** after saving a check-in. Select an inclusive local date range and optional context. Add an optional crew/report label and decide whether symptom notes should be included. Preview shows measurement coverage, missing counts, latest available values with dates/context, same-context changes, and full dated records.

Select **Print / Save as PDF** to open the browser print dialog. Choose a printer or Save as PDF. The print stylesheet includes only the report. Review the destination and contents before printing or sharing. The app does not upload, email, or store the generated report separately. Backups and reports have different purposes: JSON backups can be reimported; printed reports cannot.

Reports are snapshots of saved records at preview time. Generate a fresh preview after edits or new records. Unsaved drafts are excluded. All dates use the device timezone, which is printed on the report. Missing values remain unknown; comparisons are descriptive and are not diagnoses or fitness assessments. Print/PDF support depends on the browser; the embedded preview may not expose printing.

## Accounts and synchronization roadmap

See [the accounts and synchronization plan](docs/accounts-and-sync-plan.md) for proposed identity, access controls, encrypted local workspaces, offline synchronization, conflict handling, migration, and delivery milestones. This is a design plan; account login and cloud sync are not implemented yet.

## Workspace storage foundation

The local-only workspace now uses IndexedDB. Each save, edit, import, or delete commits a record change and a durable outbox entry in the same transaction. A journal count is displayed in the app. This is preparation for a future sync engine: no account exists, no journal entries are uploaded, and the queue is not automatically assigned to a future account.

Migration validates and verifies existing records before committing its completion marker. It is repeatable after interruption and keeps the original localStorage array unchanged as a recovery source. Export a fresh JSON backup after migration; the retained array is a one-time source, not a live mirror. Close old Orbit windows and update the installed app before editing so an older release cannot keep writing to the obsolete storage location. Rolling back to the old release will not show newer IndexedDB changes; use a fresh export instead.

Repository operations always specify a workspace. Revision checks reject stale edits/deletes from another window, preserving the unsaved form. Imports merge against current database state and cannot resurrect deleted IDs; save a genuinely new measurement with a new ID when needed. Other current-version tabs refresh through BroadcastChannel, or when made visible. Workspace partitioning is a development boundary, not authentication or encryption.

Deletion hides records using tombstones for future sync. Earlier values may still exist in the local journal and migration backup; deletion is not secure erasure. Journal retention/compaction and explicit legacy-backup cleanup belong to the later retention work. Clearing browser site data removes all local records, journal entries and offline assets. There is no cloud recovery yet.

Storage startup failures disable writes and show an explanation. Valid legacy data is offered read-only for export if available. Transient write failures keep form values and leave both records and journal unchanged. Storage loading blocks saves until initialization completes. Automated tests cover migration rollback/retry, persistence across reopen, workspace isolation, stale writes, atomic outbox failures, imports, and the existing UI workflow.

## Educational observations awaiting review

**Health observations** presents recent data gaps, sleep-duration sequences, wellbeing rating changes, and blood-pressure measurement context with source links and dated evidence. Every rule is marked **Awaiting medical review**; no reviewer or approval is claimed. Sources provide background, not validation of app rules. Clinical alerts remain disabled. No output means no observation was generated, not that health is normal. The panel uses the preceding seven days; the separate What changed panel uses all saved history.

See [the insight review specification](docs/insights-review.md) for source rationale, trigger definitions, limitations, and the qualified-review checklist. The app does not interpret symptom text, diagnose conditions, or prescribe treatment. These dashboard observations are not automatically included in printed reports.

## Guided breathing

Space to breathe replaces the earlier games and garden with a calm space backdrop and a circle that expands for an inhale and contracts for an exhale. The default Box breathing method uses a 4-second inhale, hold, exhale, hold cycle, following Defense Health Agency tactical-breathing guidance. The circle stays steady during holds; Skip hold advances to the next phase without adding elapsed time. Holds are optional. Gentle breathing offers 3, 4 or 5 seconds per phase without holds. Choose a 1, 2 or 5 minute guide. Start, pause, resume or stop anytime. Resume starts a fresh inhale cue; switching tabs/windows or a browser timing stall pauses the guide. The pace is optional: breathe gently, never force the timing or depth, and stop if uncomfortable.

Circle movement and counting can be turned off. Reduced-motion preferences disable the expanding circle while text guidance remains. The guide is bundled for offline production use, records no activity or wellbeing data, and does not claim measured stress reduction or clinical validation. Interpretations and protocol review remain **Awaiting medical review**. Links inside the activity explain the NHS guidance and NCCIH evidence limitations; the interface and timing choices are Orbit adaptations, not a flight protocol or NASA endorsement.

Previous cognitive-session storage is retained to preserve earlier results. Health data and reports remain separate and unchanged.

## Optical waveform preview versus camera stream

The Real-time deck plots incoming native `rppg-telemetry` pulse values as a green, relatively scaled optical trace. Zero samples remain valid; lost face detection or a stream timeout clears the signal instead of substituting an ECG waveform. No quality or clinical validity is inferred from samples arriving. Camera estimates can be absent while a waveform is present.

The browser cannot invoke the Python camera sidecar. **Preview optical demo** shows an explicitly simulated optical-style waveform and labeled demo values, without publishing those values as measured vitals. Native camera rPPG does not supply SpO2, respiration or perfusion-index values in the current payload, so those remain unavailable. The wearable panel remains not connected until a real integration exists. The teammate-owned `rppg/` pipeline is unchanged.
