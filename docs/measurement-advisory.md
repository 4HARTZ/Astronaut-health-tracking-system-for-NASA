# Offline measurement advisory prototype

Status: Awaiting medical review. Version 1.0.0. No reviewer, clinical validation, approved mission thresholds, or NASA endorsement is claimed. Sources checked 2026-11-14. This system combines deterministic reference checks with an adaptive statistical anomaly model. It does not use a language model, neural network, medical training dataset, external API, or camera estimates.

## Data path

Saved check-in → latest eligible record → freshness and field validation → reference rules and personal baseline fit → sorted review flags and evidence.

The same JavaScript engine runs in the browser and desktop app. It fits from the workspace's current saved records each time they change; no separate model weights need downloading. Edits/deletes/imports change the fit. There is no persistent warning history, acknowledgment store, background notification service, or automatic medical-team contact. Exported measurement backups retain the input records, not a fixed warning result. Existing printed reports do not include flags.

Only the latest record is evaluated, rather than combining measurements from different times. Future and invalid timestamps and explicitly synthetic/camera records are excluded. Every field must be a finite number within the check-in schema's entry bounds; missing or invalid values remain unknown. A recent notes-only check-in does not reuse older vitals. A check-in older than 24 hours produces a stale-data explanation rather than current warnings. This freshness window is a product choice, not clinical evidence. Time is rechecked once a minute and on focus/visibility changes. It relies on the device clock.

## Personal baseline model

For each of heartRate, systolic, diastolic, temperature and sleep:

1. Select the previous 30 days relative to the evaluated record, in the same context.
2. Exclude the entire evaluated local date, future records and synthetic sources.
3. Select the most recent available reading per distinct local date for that indicator.
4. Require at least eight such dates; otherwise show Learning with the count.
5. Fit the median and median absolute deviation (MAD).
6. Set spread to max(1.4826 × MAD, minimum spread).
7. Flag absolute difference from median divided by spread ≥3.5.

Minimum spread: pulse 5 bpm, systolic 8 mmHg, diastolic 5 mmHg, temperature 0.2 °C, sleep 0.5 h. This prevents a constant or nearly constant history creating division-by-zero or huge deviations from tiny changes. Every flag includes the training dates/values, median, spread and deviation. No probability or confidence percentage is assigned.

[NIST's statistical outlier discussion](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm) describes modified z-scores using the median and MAD. Orbit's eight-date minimum, per-day selection, time window, ≥ comparison and spread floors are adaptations chosen for this prototype. They have not been calibrated or medically validated. Statistical unusualness does not establish disease; a stable abnormal history can look usual. Mixing crew members, biased devices, changes in procedure, schedule or medication can invalidate the learned pattern. This is one workspace baseline, not authenticated person-specific training.

## Reference and self-report rules

| Rule | Trigger | Priority / source |
| --- | --- | --- |
| Resting pulse | <60 or >100 bpm, Resting context | Review; [AHA pulse guidance](https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse). Athletes may have lower rates. |
| Resting pressure | Systolic ≥140 or diastolic ≥90, paired, Resting context | Review; [AHA categories](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings). A single reading is not a diagnosis. |
| Very high pressure | Systolic >180 or diastolic >120, paired, any context | Urgent review; [AHA very-high-pressure guidance](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/when-to-call-911-for-high-blood-pressure). Mission-specific emergency procedures take precedence. |
| Low temperature | <35 °C | Urgent review; [NHS low-temperature guidance](https://www.nhs.uk/conditions/hypothermia/). Measurement site/device matter. |
| Raised temperature | ≥38 °C | Review; [NHS adult fever guidance](https://www.nhs.uk/symptoms/fever-in-adults/). The rule does not identify the cause. |
| Recorded sleep | <7 hours | Review; [CDC adult sleep guidance](https://www.cdc.gov/sleep/about/). Age, naps and whether this log represents total sleep matter. |
| Informal ratings | Stress ≥4, mood ≤2 or sleep quality ≤2, on 1–5 scales | Review; Orbit product prompts, no validated screening cutoff. |

These Earth-based adult references are not flight-specific or universal (including for pregnancy or individualized conditions). Routine pulse and pressure rules are skipped outside Resting. The very-high-pressure rule is kept for all contexts as a prompt for immediate qualified review, not a classification of post-exercise physiology. Higher-priority pressure flags replace routine pressure flags; model flags may coexist because they explain a different comparison.

Urgent labels mean the record merits prompt medical review. The app cannot determine emergency status from numbers alone, does not interpret symptom text, does not prescribe treatment, and cannot clear or restrict duty. It reminds users to follow mission emergency procedures if concerning symptoms accompany very high pressure. No-flag output is never a health clearance. Clinical deployment requires review of thresholds, measurement procedures, personal conditions, false positives/negatives, escalation, accessibility and human factors.

## Verification

Automated checks cover threshold boundaries, either-component pressure flags, priorities, missing/invalid values, context restrictions, stale/future inputs, synthetic exclusion, stable/outlier training histories, distinct-date weighting, target exclusion, edits/deletes, evidence, immediate post-save evaluation, UI navigation, and freshness on focus. These establish software behavior, not clinical or model accuracy.

Manual: use synthetic check-ins to exercise review and urgent states, save a correction and confirm flags refresh, inspect source/evidence details, then supply at least eight earlier distinct dates in the same context to exercise Learning → Ready and personal-pattern flags. Repeat offline in the packaged desktop app. Do not seed demo data into real crew records.
