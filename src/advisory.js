import { definitions, sortEntries } from './health.js';

// Use the saved-record schema. Missing values must never become zero or a status.
export function latestReview(entries, now = Date.now()) {
  const entry = sortEntries(entries.filter(e => Number.isFinite(Date.parse(e.time)) && Date.parse(e.time) <= now))[0] ?? null;
  return {
    entry,
    readings: definitions.map(([key, label, unit]) => ({
      key, label, unit,
      value: Number.isFinite(entry?.[key]) ? entry[key] : null,
    })),
  };
}

// An arbitrary UI demonstration, not SAFTE, AI inference, or a fatigue prediction.
export function illustrativeCurve(sleep, quality) {
  if (!Number.isFinite(sleep) || sleep < 0 || sleep > 24 || !Number.isFinite(quality) || quality < 1 || quality > 5) {
    throw new Error('Choose sleep between 0 and 24 hours and quality between 1 and 5.');
  }
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    value: Math.round(Math.max(0, Math.min(100,
      sleep / 24 * 60 + quality / 5 * 20 + 20 * Math.cos((hour - 16) * Math.PI / 12)
    ))),
  }));
}
