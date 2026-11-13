# Cognitive activities — adaptation specification

Interface status: replaced by Space to breathe, an optional breathing guide. This document describes the earlier prototype only. Its code and local storage remain for compatibility; these activities are no longer mounted in the main app. The breathing guide does not collect task or wellbeing results.

Status: **Awaiting medical review**. No reviewer or approval claimed. Task version 1.0.0. Source review: 2026-11-13.

These optional visual activities describe performance, not mental state, diagnosis, treatment, fitness for duty or a mental-health score. No clinical validation or NASA endorsement. Sleep/circadian timing, practice, motivation, stress, vision, motor ability, hardware/input latency and interruptions can affect results. They cannot establish why performance changes. No diagnostic thresholds, population norms, rankings, rewards or streaks.

## Original protocols

Signal Watch: 180 seconds, first signal after 1.5 seconds. After an answered or expired signal, wait randomly 1–4 seconds. Each signal remains available for up to 3 seconds; do not open a new signal in the last 3 seconds. This response window is a game rule, not a medical lapse cutoff. Record early responses separately. Show answered/total, unanswered, early responses, median and min–max response time. Practice lasts 20 seconds.

Position Match: 40 presentations in a fixed 3×3 grid, with 2 seconds of marker visibility and a 1-second neutral gap per presentation. Responses remain available throughout the 3-second trial. First two presentations are unscored; 13 of 38 eligible presentations are matches. Shuffle target positions and choose nonmatches excluding the position two trials earlier. Two explicit choices: Match / Different. Eight presentations in practice (two targets among six eligible trials). Position 2-back is not a copy of Cognition's fractal task. Show correct/eligible, unanswered, incorrect matches/differences and correct-response median/range. No adaptive difficulty.

Keyboard: Space for Signal Watch; M/D for Position Match. Pointer mode uses large response buttons. Held-key repeats are ignored. Complete practice for the chosen activity and input before scored play. Practice is not persisted. Exit button and Escape end an attempt immediately. Hidden page, window blur or a frame gap over 1 second ends an attempt as interrupted, never resumable. No stimulus motion, flashing effects or color-only information. These remain visual timed activities; no equivalent screen-reader assessment is claimed.

Browser timing uses performance.now and requestAnimationFrame; recorded onset is a frame-callback timestamp, not a calibrated physical display onset. Each trial records scheduling delay. Physical display/input latency is unknown. One-second stall handling is a technical quality rule, not a cognitive threshold. No research-grade precision claim.

## Storage and interpretation

IndexedDB orbit-v2 schema version 2 adds cognitiveSessions without changing health data. Each scored start, trial onset, response and ending is saved with a cognitive-session journal entry in one transaction. Failed writes interrupt play and leave a retryable result. A sudden crash can lose the newest unsaved event; the prior persisted running session is displayed as incomplete with no saved ending, never inferred to be completed. Another tab's running session is not modified. Closing while active attempts an interrupted save, but browser termination cannot guarantee it.

Store protocol version, app version, timestamps/timezone, selected input, observed response input, viewport/pixel ratio, browser user agent, reduced-motion setting, exact position sequence, trial timestamps, response times, correctness and interruption reason. No fingerprint identifier or upload. The full local journal contains earlier snapshots; clearing/deleting browser data and journal retention limitations still apply. Browser context in exports may reveal device information.

History shows up to 30 attempts per activity; separate JSON export includes all sessions and trial data. Import validates the complete backup before writing, preserves existing IDs and commits atomically. Cognitive backups are not measurement backups. Current health reports, health charts, daily checklist and observations exclude these sessions. Completed sessions with identical task version and selected input can be compared descriptively; hardware/browser differences remain possible confounders. No clinical baseline, alerts or automatic explanation of changes.

## Evidence and reuse

- [Basner et al. (2011), brief PVT validation](https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/): supports investigating shorter vigilance tasks; changing duration/protocol changes sensitivity. Orbit is not validated PVT-B.
- [NASA, Sleep on Station](https://www.nasa.gov/humans-in-space/science-in-space-week-of-sept-15-2023-sleep-on-station/): describes the previous five-minute ISS Reaction Self Test, establishing mission relevance rather than Orbit equivalence.
- [Basner et al. (2015), Cognition development](https://pmc.ncbi.nlm.nih.gov/articles/PMC4691281/): spaceflight task selection and repeated-use considerations. Orbit uses neither its software nor fractal assets.
- [Dev et al. (2024), ISS missions](https://pubmed.ncbi.nlm.nih.gov/39633651/): generally stable performance with task-specific phase differences among 25 astronauts; does not validate this prototype or establish effects on exploration missions.
- [Kane et al. (2007)](https://pubmed.ncbi.nlm.nih.gov/17470009/): cautions against treating n-back performance as general working-memory capacity.
- [Computerized Corsi comparison (2014)](https://pubmed.ncbi.nlm.nih.gov/25258029/): digital adaptation can alter task properties; sequence recall remains an alternative.

Original implementation, instructions, geometric grid and generated sequences. No established test software, manual, branded forms, images, stimulus sets, scoring norms or cutoffs copied. No explicit redistribution license was established for Cognition/PVT-B assets; any future copying requires asset-specific permission/license review. Reading an open paper does not grant software/assessment reuse rights. [PsyToolkit copyright](https://us.psytoolkit.org/copyright.html) illustrates platform and third-party experiment restrictions; no PsyToolkit materials used. [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) is not blanket permission for third-party assessments or endorsement.

## Verification and remaining evaluation

Automated checks cover controlled target frequency, missing-data summaries, workspace separation, atomic journaling/import, schema upgrade, backup roundtrip, practice gating, response controls and focus/stall interruption. Build-time offline bundling includes the games without external runtime assets. Before mission/research use, conduct accessibility/usability evaluation, calibrated hardware timing measurements, repeatability and alternate-sequence evaluation, and qualified medical review. Software tests do not establish clinical validity.
