import { sortEntries } from './health.js';

// Experimental, explainable demonstration rules. These are not clinical thresholds.
export const SIMULATED_LABEL = 'SIMULATED DEMONSTRATION DATA — NOT REAL MEDICAL RECORDS';
export const SYSTEMS = [
  { id: 'cardiovascular', label: 'Cardiovascular', region: 'heart', fields: ['heartRate', 'systolic', 'diastolic'] },
  { id: 'respiratory', label: 'Respiratory', region: 'lungs', fields: ['spO2', 'respiration'] },
  { id: 'recovery', label: 'Stress & recovery', region: 'brain', fields: ['stress', 'sleep', 'quality', 'mood'] },
  { id: 'hydration', label: 'Hydration / urinary', region: 'kidneys', fields: ['urineColor'] },
];

const has = (record, field) => Number.isFinite(record?.[field]);
const clamp = value => Math.max(0, Math.min(100, value));
const statusFor = score => score >= 85 ? 'Good' : score >= 70 ? 'Stable' : score >= 50 ? 'Attention' : 'Critical';
const rounded = value => Math.round(value);

function scoreField(record, field) {
  const value = record[field];
  if (field === 'heartRate') return { score: clamp(100 - Math.max(0, Math.abs(value - 70) - 10) * 2), label: 'Resting heart rate', value, unit: 'bpm', explanation: 'Prototype reference point 70 bpm; values within 60–80 receive full points, then lose 2 points per bpm.' };
  if (field === 'systolic') return { score: clamp(100 - Math.max(0, Math.abs(value - 110) - 10) * 2), label: 'Systolic pressure', value, unit: 'mmHg', explanation: 'Prototype reference point 110 mmHg; values within 100–120 receive full points, then lose 2 points per mmHg.' };
  if (field === 'diastolic') return { score: clamp(100 - Math.max(0, Math.abs(value - 70) - 10) * 2), label: 'Diastolic pressure', value, unit: 'mmHg', explanation: 'Prototype reference point 70 mmHg; values within 60–80 receive full points, then lose 2 points per mmHg.' };
  if (field === 'spO2') return { score: clamp((value - 80) * 5), label: 'Blood oxygen saturation', value, unit: '%', explanation: 'Prototype scale maps 80% to 0 and 100% to 100.' };
  if (field === 'respiration') return { score: clamp(100 - Math.max(0, Math.abs(value - 16) - 4) * 5), label: 'Respiratory rate', value, unit: 'breaths/min', explanation: 'Prototype reference band is 12–20 breaths/min; values outside lose 5 points per breath/min.' };
  if (field === 'stress') return { score: (5 - value) * 25, label: 'Stress rating', value, unit: '/ 5', explanation: 'Self-rating is inverted linearly: 1 = 100, 5 = 0.' };
  if (field === 'sleep') return { score: clamp(value / 8 * 100), label: 'Sleep duration', value, unit: 'hours', explanation: 'Prototype reference is 8 hours; capped at 100.' };
  if (field === 'quality' || field === 'mood') return { score: (value - 1) * 25, label: field === 'quality' ? 'Sleep quality' : 'Mood', value, unit: '/ 5', explanation: 'Self-rating maps 1 to 0 and 5 to 100.' };
  if (field === 'urineColor') return { score: clamp((8 - value) * 20), label: 'Urine colour', value, unit: 'scale 1–8', explanation: 'Demonstration-only hydration proxy: lighter values score higher; colour alone cannot establish hydration.' };
  return null;
}

function makeSystem(definition, entries, now) {
  const ordered = sortEntries(entries);
  const matching = ordered.filter(entry => definition.fields.some(field => has(entry, field)));
  const latest = matching[0] ?? null;
  const contributors = latest ? definition.fields.filter(field => has(latest, field)).map(field => scoreField(latest, field)) : [];
  const score = contributors.length ? rounded(contributors.reduce((sum, item) => sum + item.score, 0) / contributors.length) : null;
  const lastCheckedAt = latest ? (latest.submittedAt ?? latest.time) : null;
  const ageDays = lastCheckedAt ? Math.max(0, Math.floor((now - Date.parse(lastCheckedAt)) / 86_400_000)) : null;
  const stale = ageDays !== null && ageDays > 7;
  const missing = definition.fields.filter(field => !latest || !has(latest, field));
  const explanations = contributors.map(item => `${item.label}: ${rounded(item.score)}/100. ${item.explanation}`);
  if (contributors.length) explanations.unshift(`Combined system indicator: equal-weight mean of ${contributors.length} available measurement scores.`);
  if (missing.length) explanations.push(`Incomplete: ${missing.map(field => ({ systolic: 'systolic pressure', diastolic: 'diastolic pressure', spO2: 'SpO₂', respiration: 'respiratory rate', heartRate: 'heart rate', stress: 'stress', sleep: 'sleep duration', quality: 'sleep quality', mood: 'mood', urineColor: 'urine colour' }[field])).join(', ')} not present in this check-in.`);
  if (stale) explanations.push('Outdated: latest contributing check is more than 7 days old.');
  return {
    ...definition, score, status: score === null ? 'No data' : stale ? 'Outdated' : statusFor(score), latest,
    ageDays, lastCheckedAt, stale, missing, contributors, explanations, history: matching.slice(0, 8),
    simulated: Boolean(latest?.simulated),
  };
}

export function buildHealthIntelligence(entries, now = Date.now()) {
  const systems = Object.fromEntries(SYSTEMS.map(definition => [definition.id, makeSystem(definition, entries, now)]));
  const assessed = Object.values(systems).filter(system => system.score !== null && !system.stale);
  const available = Object.values(systems).filter(system => system.score !== null);
  const overallScore = assessed.length >= 2 ? rounded(assessed.reduce((sum, system) => sum + system.score, 0) / assessed.length) : null;
  const overall = {
    score: overallScore,
    status: overallScore === null ? 'Insufficient data' : statusFor(overallScore),
    monitored: available.length,
    attention: available.filter(system => system.score < 70 || system.stale).length,
    unavailable: Object.values(systems).filter(system => system.score === null || system.stale).length,
    lastAssessment: assessed.map(system => system.latest).sort((a, b) => Date.parse(b.time) - Date.parse(a.time))[0] ?? null,
    incomplete: assessed.length < SYSTEMS.length,
    explanations: overallScore === null
      ? ['At least two fresh body-system checks are needed for a prototype overview.']
      : [`Equal-weight mean of ${assessed.length} fresh system scores: ${assessed.map(system => `${system.label} ${system.score}`).join(', ')}.`, assessed.length < SYSTEMS.length ? 'Overview is incomplete because some systems are missing or outdated.' : 'All mapped systems have fresh measurements.'],
  };
  const regions = {
    brain: systems.recovery,
    heart: systems.cardiovascular,
    lungs: systems.respiratory,
    abdomen: { id: 'digestive', label: 'Digestive system', score: null, status: 'No data', contributors: [], explanations: ['No digestive-system parameter is currently collected.'], history: [], latest: null, ageDays: null, missing: ['No mapped input'] },
    kidneys: systems.hydration,
    muscles: { id: 'musculoskeletal', label: 'Musculoskeletal system', score: null, status: 'No data', contributors: [], explanations: ['No musculoskeletal parameter is currently collected.'], history: [], latest: null, ageDays: null, missing: ['No mapped input'] },
  };
  return { systems, overall, regions, recent: sortEntries(entries).slice(0, 6) };
}

export function createRyanDemoEntries(now = Date.now()) {
  const samples = [
    { days: 12, heartRate: 76, systolic: 122, diastolic: 78, spO2: 97, respiration: 16, stress: 2, sleep: 7.5, quality: 4, mood: 4, urineColor: 3 },
    { days: 8, heartRate: 72, systolic: 118, diastolic: 76, spO2: 98, respiration: 15, stress: 3, sleep: 6.8, quality: 3, mood: 3, urineColor: 4 },
    { days: 5, heartRate: 74, systolic: 120, diastolic: 77, spO2: 98, respiration: 15, stress: 4, sleep: 6, quality: 2, mood: 3, urineColor: 5 },
    { days: 2, heartRate: 71, systolic: 116, diastolic: 74, spO2: 99, respiration: 14, stress: 4, sleep: 6.5, quality: 3, mood: 3, urineColor: 5 },
  ];
  return samples.map((sample, index) => {
    const { days, ...measurements } = sample;
    const time = new Date(now - days * 86_400_000).toISOString();
    return { id: `ryan-sim-${index + 1}`, time, submittedAt: time, context: 'Resting', notes: `${SIMULATED_LABEL}. Synthetic prototype history for demonstration only.`, ...Object.fromEntries(['heartRate','systolic','diastolic','temperature','sleep','quality','mood','stress','spO2','respiration','urineColor'].map(field => [field, measurements[field] ?? null])), simulated: true };
  });
}
