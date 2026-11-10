# Orbit — Astronaut health check-in

Initial web-app prototype by team **4HARTZ**. Manual measurements, latest check-in cards, dated history, recent trend charts, and JSON export. No dependencies or build step.

## Run locally

From this folder, with Python installed:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Open http://localhost:8080 in a modern browser. Keep the same hostname and port to access the same storage. No internet connection is needed for the app itself. Stop the server with Ctrl+C.

## Scope and limitations

Record resting heart rate, paired blood pressure, temperature, sleep duration and quality, mood, stress, and symptom notes. Missing measurements remain missing. Charts show up to seven most recent available values per indicator with dated text equivalents.

This is a prototype, not a medical device. Input limits are not clinical thresholds. There are no diagnoses, treatment recommendations, health scores, clinical alerts, or baseline assessments. Future medical rules and measurement procedures require qualified mission medical review.

Records are stored unencrypted in localStorage for one browser origin. Use synthetic data during development. There is no authentication, backend, synchronization, or production security. Clearing browser data removes records. JSON exports provide backup files; imports merge new records, skip duplicates, and preserve existing records when IDs conflict. Imports validate the complete backup before saving. Basic vital signs cannot assess bone density, radiation dose, or immune function.

## Verification

```powershell
node --check app.js
```

Manual acceptance: save partial measurements; reload to confirm persistence; reject an empty submission and a single blood-pressure value; add two dated readings to inspect a chart; export and inspect JSON; navigate by keyboard; inspect a narrow viewport. Confirm a blocked/full storage error preserves form input.

## Next steps

1. Review the workflow with users and medical advisers.
2. Add broader browser coverage and optional chart comparisons.
3. Define identity, encryption, privacy, and crew-sharing requirements.
4. Develop medically reviewed baseline comparisons and escalation protocols.
5. Add installable offline support and optional device integrations.

## Record management and trends

History provides Edit and Delete actions. Deletion requires confirmation; edits can be cancelled. Storage failures preserve existing records and unsaved form input. Import accepts version 1 Orbit JSON exports up to 5 MB and 10,000 records. Invalid backups are rejected without changing saved data.

Charts filter by inclusive local dates and measurement context, showing up to 100 recent available readings. The What changed panel compares the most recent comparable pair per indicator in the same context, with dates and raw differences; it does not infer causes or health status.

Run behavior checks with `node --test tests/app.test.cjs`.
