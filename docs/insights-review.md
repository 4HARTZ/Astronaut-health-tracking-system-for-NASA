# Insight rules awaiting medical review

Status: **Awaiting medical review**. No reviewer assigned, no approval date, no clinical alerts. Rule version 1.0.0. Sources checked 2026-11-12.

The Health observations panel uses saved records from the preceding seven elapsed days (excluding future timestamps). It runs on-device, without AI inference, uploads, diagnoses, or treatment instructions. Empty output must never be labeled normal or safe. This seven-day selection window and all trigger choices are product demonstration logic, not NASA/AHA endorsed thresholds.

## Rules and boundaries

- **Coverage:** list null fields in the latest recent record. A zero is a recorded value, not missing. This is app data validation with no claimed medical source.
- **Sleep:** examine the latest three available sleep readings on distinct device-local dates for each context, keeping only the latest reading per date. A strictly decreasing sequence produces a dated observation. The sequence need not cover consecutive calendar days. It does not establish insufficient sleep, fatigue, a personal baseline or causality. At most one sleep pattern is shown.
- **Wellbeing:** use the most recent comparable pair per mood/stress field with matching context. Report raw values and scale direction when they differ. These informal 1–5 ratings are not diagnostic or validated screening instruments.
- **Pressure context:** when the latest recent record contains a blood-pressure pair, show its units/context and explain the importance of procedure. Do not apply Earth-based pressure categories or infer measurement quality from values. No seated posture, gravity-dependent advice, repeat interval or treatment is prescribed as a mission procedure.

Evidence timestamps and context appear under Why am I seeing this? The review register shows trigger definitions, limitations, source links, rule version, reviewer/approval absence and source-check date. Nothing in the UI can mark a rule reviewed. The existing What changed panel remains a separate all-history numerical comparison; it has no medical interpretation.

## Source rationale

[NASA isolation and confinement](https://www.nasa.gov/hrp/hazard-isolation-and-confinement/) supplies background on sleep, circadian disruption, workload and performance. It does not validate this app's three-reading trigger.

[NASA behavioral health risk](https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/) supplies background on isolation/confinement and behavioral health. It does not validate the app's mood/stress scales.

[AHA home blood pressure monitoring](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home) explains measurement technique and recording. It is Earth-based general guidance, not a validated flight protocol.

## Evaluation checklist for qualified reviewers

1. Specify intended users, mission environments, devices, measurement procedures, exclusions and communication constraints.
2. Evaluate the validity of each indicator and rating scale, observation window, trigger and proposed wording. Test missing data, same-day repeats, timezones, irregular sampling and context differences.
3. Review false positives, missed changes, and the risk of false reassurance. Consider symptoms separately; this engine does not interpret free-text notes or detect emergencies.
4. If clinical thresholds/actions are later proposed, document evidence, applicability, contraindications, escalation route, ownership and versioned approval before enabling them.
5. Record the qualified reviewer's identity, role, decision, date, rationale and next review date in a controlled review record. Source links and a hackathon evaluation alone do not constitute clinical approval.

Automated tests verify deterministic triggers and boundaries only, not clinical validity. Insights are currently dashboard-only; existing printed reports do not automatically include these unreviewed educational observations.
