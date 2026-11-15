# Orbit — Astronaut health check-in

A React + Vite browser app and Tauri desktop prototype by team **4HARTZ**. Record basic health indicators, review trends, edit records, and import/export backups.

## Run locally

Requires Node.js 22.12 or newer (Node 22 LTS recommended) and npm.

```powershell
npm ci
npm run dev
```

Open http://localhost:8080. Stop the server with Ctrl+C. Vite uses strict port 8080 to preserve the original app's browser storage address; stop an older Python server first if that port is occupied. The Python command no longer runs the source app because JSX needs Vite's transformation.

## Browser and desktop capabilities

| Feature | Browser | Tauri desktop |
| --- | --- | --- |
| Saved check-ins, charts, reports, JSON backups | IndexedDB | Local SQLite file |
| Offline app files | Production service worker after setup | Bundled with the installed app |
| Cognitive activities | Signal Watch and Position Match, saved separately | Not available in the SQLite workspace yet |
| Breathing guide | Available, no results stored | Available, no results stored |
| Real-time monitor | Clearly labelled synthetic demonstration | Demo plus experimental camera pulse estimator |
| Advisory and warnings | Local personal-baseline model, reference flags, saved values, example curve | Same |
| Login, cloud sync, encryption, Bluetooth/serial devices | Not implemented | Not implemented |

The desktop app has a local Rust backend, not a remote server. Browser and desktop databases are separate: there is no automatic browser-to-SQLite migration or synchronization. Export/import measurement JSON to move records. The native repository has different import/conflict and revision behavior from the browser repository; do not assume the browser's stale-edit protection exists in native storage. Cognitive backups cannot be imported into SQLite.

## Run or package the desktop app

Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS, including Rust/Cargo. On macOS, install Xcode Command Line Tools. With npm dependencies installed:

```bash
npm run tauri -- dev
npm run tauri -- build
```

Development opens a native window and starts Vite automatically; stop an existing port-8080 server first. The installed production app uses bundled files and needs no Vite server. Build on the target platform: macOS produces `.app` and `.dmg`; Windows produces an NSIS installer. Outputs are under `src-tauri/target/release/bundle/`. Signing and notarization for distribution are not configured by this prototype.

Camera support is optional and needs a separate Python environment, even in a packaged app. The script and face model are bundled; Python and its libraries are not. After one successful connection using an absolute `ORBIT_PYTHON` path, Orbit remembers that interpreter for future launches from Finder. See [desktop camera setup](docs/desktop-camera.md). Missing dependencies or denied camera permission produce an error, never synthetic measurements disguised as camera output.

## Existing records and backups (browser)


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

### Integrated health intelligence prototype

The Vitals dashboard adds a clickable body map and an explainable fusion overview. Check-ins can also capture SpO₂, respiratory rate, and a urine-colour demonstration scale. Browser records retain the same IndexedDB record structure with optional new fields; existing records without them remain valid. A `submittedAt` timestamp is recorded on successful saves and drives the days-since-check timers; older records fall back to their measurement time. Tauri adds `sp_o2`, `respiration`, `urine_color`, `submitted_at`, and `simulated` columns to each account's existing SQLite database using an additive migration.

Fusion is experimental demonstration logic, not a clinical assessment. Cardiovascular score is the equal-weight mean of available heart-rate, systolic-pressure, and diastolic-pressure prototype scores. Respiratory score equally combines available SpO₂ and respiratory-rate scores. Stress/recovery equally combines available stress, sleep duration, sleep quality, and mood scores. Hydration uses urine colour alone as a clearly qualified demonstration proxy. The overall indicator is the equal-weight mean of fresh (seven days or newer) system scores when at least two systems have data. Incomplete and outdated inputs are identified; missing inputs are never treated as healthy. The assumptions and scoring scales are centralized in `src/fusion.js` and are not medically validated.

Ryan's dashboard seeds four dated synthetic check-ins only when Ryan's account workspace is empty. Seed records have `simulated: true` and visibly include **SIMULATED DEMONSTRATION DATA — NOT REAL MEDICAL RECORDS**. The other account workspaces are not seeded. Existing Ryan records are preserved. The integrated dashboard uses saved check-ins, not the separate live-monitor demonstration values.

Charts filter by inclusive local dates and measurement context and show up to 100 recent available values per indicator, with dated text equivalents. What changed compares the most recent comparable pair per indicator in the same context. These observations do not infer causes or health status.

This is a prototype, not a medical device. Entry limits are not clinical thresholds. There are no diagnoses, treatment recommendations, validated health scores, or approved clinical alerts. The advisory prototype fits a statistical baseline and generates unvalidated measurement review flags. Future medical rules require qualified mission medical review. Basic readings cannot assess bone density, radiation dose, or immune function.

Browser records and the local change journal remain unencrypted in IndexedDB; desktop check-ins are stored unencrypted in SQLite. The original localStorage array is retained as a migration backup. Use synthetic data in development. There is no authentication, remote backend, cloud synchronization, or production security. The desktop version has a local Rust backend. Clearing browser data removes records. The app uses no external runtime assets, and production builds support installation and offline app-shell caching.

## Manual acceptance

Save partial measurements, reload to confirm persistence, cancel and save edits, confirm/cancel deletion, import an old export twice, reject malformed JSON, inspect charts and filters, export JSON, navigate by keyboard, and inspect a narrow viewport. Confirm a blocked/full storage error preserves inputs.

## Remaining work

1. Native build, installed-app, and camera testing on each target OS.
2. Native cognitive-session persistence and browser/desktop storage parity.
3. Identity, encryption, retention, privacy, and sharing requirements.
4. Qualified review of any future clinical rules; no clinical scoring is enabled.
5. Hardware sensor integration and a self-contained packaged camera runtime, if required.

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

The app now has a local prototype login for Ryan, Tharusha, Hansaja, and Apurwa (password `1234` for each). There is no sign-up. This is only a UI gate: the credentials are hardcoded in the frontend and can be read or bypassed by someone with access to the app or device. Data is not encrypted. Browser check-ins are kept in separate IndexedDB workspaces; Tauri check-ins use separate per-account SQLite files. Existing unassigned browser records and the previous shared desktop database are left untouched and are not automatically assigned to an account. Export/import records into the intended account if needed. Do not use this prototype login to protect real medical records.

See [the accounts and synchronization plan](docs/accounts-and-sync-plan.md) for production identity, access controls, encrypted local workspaces, offline synchronization, conflict handling, migration, and delivery milestones. Cloud sync is not implemented.

## Workspace storage foundation (browser)

Each browser crew account uses its own IndexedDB workspace. Each save, edit, import, or delete commits a record change and a durable outbox entry in the same transaction. The old local-only workspace remains available for legacy data but is not automatically assigned to a crew account. No journal entries are uploaded, and the queue is not assigned to a future cloud account.

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


## Advisory, warnings, and simulation

The Advisory & Warnings tab combines a local statistical anomaly model with explicit reference rules. All processing runs offline on saved check-ins in either IndexedDB or SQLite. A workspace-wide summary opens the panel when flags are present. Each flag shows its measured value, timestamp/context, rule or model evidence, and next review step. No health data is uploaded, and there is no external model service.

The model fits a per-indicator median and robust spread from eight or more distinct prior dates in the same context within 30 days. Before that it shows Learning. The evaluated date is excluded from fitting; duplicate days do not add weight. It is an adaptive statistical model, not a neural network, clinical predictor or validated personal health baseline. Keep one crew member's records per workspace; editing the profile does not partition records.

Only the latest saved check-in within 24 hours is evaluated for current flags. Missing, invalid, future and synthetic values are excluded; absent flags do not establish safety. Unvalidated camera estimates never feed the warnings. Sources provide general adult Earth-based references, not approved spaceflight protocols. The 24-hour freshness window, baseline settings, informal rating prompts, and adaptation rules are product choices awaiting medical review. See [advisory model and rule specification](docs/measurement-advisory.md).

The separate illustrative sleep curve remains a demonstration in arbitrary units, not SAFTE, AI inference, or a validated fatigue forecast. Changing its controls never changes records or warnings. Medication instructions, NASA compliance claims and EVA go/no-go output remain disabled. The older educational observations panel is separate from these measurement flags.

## Cognitive activities and breathing

Both features are present: the Cognitive tab offers browser-only Signal Watch and Position Match. The breathing guide appears separately, stores no results, and supports optional holds, pause, stop, and reduced motion. These are not fitness-for-duty assessments. See [activity specification](docs/cognitive-activities.md).

Theme preferences persist locally; the editable crew profile is currently session state, not an authenticated identity. Settings links to the Vitals history for unencrypted measurement backups. The local journal is not included in those exports.

## Additional checks

```bash
python3 tests/rppg_test.py
cargo test --manifest-path src-tauri/Cargo.toml
```

The Python tests use only the standard library and do not access the camera. Rust checks require the desktop toolchain. Browser tests cover advisory record mapping, missing values, simulator updates, camera event ordering, cleanup, and failure states using a mocked desktop bridge; they do not validate camera accuracy or a signed installer.
