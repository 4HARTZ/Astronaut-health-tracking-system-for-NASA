import { definitions, sortEntries } from './health.js';

export const advisoryPolicy = Object.freeze({
  version: '1.0.0', status: 'Awaiting medical review',
  freshnessHours: 24, trainingDays: 30, minimumDays: 8, deviationLimit: 3.5,
});
export const advisorySources = Object.freeze({
  statistics: { title: 'NIST: statistical outlier detection', url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm' },
  heart: { title: 'AHA: adult resting pulse', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse' },
  pressure: { title: 'AHA: blood pressure categories', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings' },
  severePressure: { title: 'AHA: very high blood pressure', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/when-to-call-911-for-high-blood-pressure' },
  fever: { title: 'NHS: adult temperature', url: 'https://www.nhs.uk/symptoms/fever-in-adults/' },
  cold: { title: 'NHS: low body temperature', url: 'https://www.nhs.uk/conditions/hypothermia/' },
  sleep: { title: 'CDC: adult sleep duration', url: 'https://www.cdc.gov/sleep/about/' },
});
const DAY = 86400000;
const floors = { heartRate: 5, systolic: 8, diastolic: 5, temperature: 0.2, sleep: 0.5 };
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const localDay = time => { const d = new Date(time); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function usable(entry, key) {
  const definition = definitions.find(d => d[0] === key);
  return Boolean(definition && Number.isFinite(entry?.[key]) && entry[key] >= definition[3] && entry[key] <= definition[4]);
}
function savedEntries(entries, now) {
  return sortEntries(entries.filter(e => e && Number.isFinite(Date.parse(e.time)) && Date.parse(e.time) <= now &&
    e.simulated !== true && !['camera', 'demo', 'simulation'].includes(e.source)));
}

// Fit a robust statistical baseline, separately per context and indicator.
// No target-day data, future records, simulated input or repeated-day weighting.
export function fitPersonalBaseline(entries, target, now = Date.now()) {
  if (!target || !Number.isFinite(Date.parse(target.time))) return [];
  const end = Date.parse(target.time), start = end - advisoryPolicy.trainingDays * DAY;
  const history = savedEntries(entries, now).filter(e => e.context === target.context &&
    Date.parse(e.time) >= start && Date.parse(e.time) < end && localDay(e.time) !== localDay(target.time));
  return definitions.filter(([key]) => Object.hasOwn(floors, key)).map(([key, label, unit]) => {
    const seen = new Set();
    const samples = history.filter(e => {
      if (!usable(e, key) || seen.has(localDay(e.time))) return false;
      seen.add(localDay(e.time)); return true;
    });
    const ready = samples.length >= advisoryPolicy.minimumDays;
    const center = ready ? median(samples.map(e => e[key])) : null;
    const spread = ready ? Math.max(floors[key], 1.4826 * median(samples.map(e => Math.abs(e[key] - center)))) : null;
    return { key, label, unit, ready, sampleCount: samples.length, center, spread,
      evidence: samples.map(e => ({ id: e.id, time: e.time, value: e[key] })) };
  });
}

export function evaluateMeasurements(entries, now = Date.now()) {
  const records = savedEntries(entries, now), entry = records[0] ?? null;
  const fresh = Boolean(entry && now - Date.parse(entry.time) <= advisoryPolicy.freshnessHours * 3600000);
  const missing = definitions.filter(([key]) => !usable(entry, key)).map(([, label]) => label);
  const models = fitPersonalBaseline(records, entry, now);
  const flags = [];
  const add = (id, priority, kind, title, detail, next, rule, source = null, extra = {}) => flags.push({
    id, priority, kind, title, detail, next, rule, source,
    evidence: { id: entry.id, time: entry.time, context: entry.context }, ...extra,
  });
  if (fresh) {
    const resting = entry.context === 'Resting';
    if (usable(entry, 'heartRate') && resting && (entry.heartRate < 60 || entry.heartRate > 100)) {
      add('pulse-reference', 'review', 'reference', 'Resting pulse outside the general adult reference',
        `${entry.heartRate} bpm was recorded. The general reference is 60–100 bpm; athletic conditioning and medication can alter resting values.`,
        'Verify the device reading and resting context. Review persistent or unexpected changes with the mission medical team.',
        'Resting context and heartRate < 60 or > 100 bpm.', 'heart');
    }
    if (usable(entry, 'systolic') && usable(entry, 'diastolic')) {
      const pair = `${entry.systolic}/${entry.diastolic} mmHg`;
      if (entry.systolic > 180 || entry.diastolic > 120) {
        add('pressure-urgent', 'urgent', 'reference', 'Very high recorded blood pressure — urgent review',
          `${pair} exceeds the general adult reference of systolic >180 or diastolic >120. A reading alone cannot determine an emergency or diagnose a condition.`,
          'Contact the mission medical team promptly and follow the approved measurement procedure. If accompanied by chest pain, breathlessness, weakness or trouble speaking, follow the mission emergency protocol immediately.',
          'Either systolic > 180 or diastolic > 120 mmHg; both values must be recorded. Any context.', 'severePressure');
      } else if (resting && (entry.systolic >= 140 || entry.diastolic >= 90)) {
        add('pressure-review', 'review', 'reference', 'Recorded resting blood pressure needs review',
          `${pair} reaches the general adult reference of systolic ≥140 or diastolic ≥90. This does not diagnose hypertension.`,
          'Check units, technique and device accuracy. Share repeated readings with the mission medical team.',
          'Resting context; systolic ≥ 140 or diastolic ≥ 90 mmHg.', 'pressure');
      }
    }
    if (usable(entry, 'temperature')) {
      if (entry.temperature < 35) {
        add('temperature-low', 'urgent', 'reference', 'Very low recorded temperature — urgent review',
          `${entry.temperature} °C is below the general body-temperature reference of 35 °C. Measurement site and device accuracy matter.`,
          'Contact the mission medical team promptly and follow the mission emergency protocol as appropriate. Verify the measurement without delaying help.',
          'temperature < 35 °C.', 'cold');
      } else if (entry.temperature >= 38) {
        add('temperature-high', 'review', 'reference', 'Raised recorded temperature',
          `${entry.temperature} °C reaches the general adult fever reference of 38 °C. The app cannot identify a cause.`,
          'Verify the thermometer and measurement method. Review symptoms and the reading with the mission medical team.',
          'temperature ≥ 38 °C.', 'fever');
      }
    }
    if (usable(entry, 'sleep') && entry.sleep < 7) {
      add('sleep-duration', 'review', 'reference', 'Recorded sleep duration below adult reference',
        `${entry.sleep} hours was recorded. CDC guidance gives at least 7 hours for adults aged 18–60; one logged duration may not represent total daily sleep.`,
        'Review total sleep, naps, schedule and recording accuracy. Discuss ongoing difficulty with the mission medical team; this is not a fatigue or duty-readiness score.',
        'Recorded sleep < 7 hours; not an assessment of total sleep or an age-specific prescription.', 'sleep');
    }
    for (const [key, predicate, title] of [
      ['stress', value => value >= 4, 'Higher reported stress'],
      ['mood', value => value <= 2, 'Lower reported mood'],
      ['quality', value => value <= 2, 'Lower reported sleep quality'],
    ]) {
      if (usable(entry, key) && predicate(entry[key])) add(`rating-${key}`, 'review', 'self-report', title,
        `${entry[key]}/5 on Orbit’s informal scale. This is a product review prompt, not a validated screening result.`,
        'Review the dated rating and optional notes. Consider discussing persistent concerns privately with the mission medical team.',
        `${key}: ${key === 'stress' ? '≥ 4' : '≤ 2'} on a 1–5 scale. Prototype product rule, not a clinical cutoff.`);
    }
    for (const model of models.filter(m => m.ready && usable(entry, m.key))) {
      const deviation = Math.abs(entry[model.key] - model.center) / model.spread;
      if (deviation >= advisoryPolicy.deviationLimit) add(`model-${model.key}`, 'review', 'model', `${model.label} differs from your recorded pattern`,
        `${entry[model.key]} ${model.unit}; prior median ${Number(model.center.toFixed(2))} ${model.unit} across ${model.sampleCount} distinct dates in ${entry.context} context.`,
        'Check the entered value and measurement conditions. Discuss unexplained or persistent changes with the mission medical team. An unusual value does not identify a disease.',
        `Absolute deviation / robust spread ≥ ${advisoryPolicy.deviationLimit}. This statistical threshold and minimum spread are product choices, not medical limits.`,
        'statistics', { model: { ...model, deviation } });
    }
  }
  flags.sort((a, b) => (a.priority === 'urgent' ? 0 : 1) - (b.priority === 'urgent' ? 0 : 1));
  return { entry, fresh, missing, models, flags, urgentCount: flags.filter(f => f.priority === 'urgent').length };
}
