import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateMeasurements, fitPersonalBaseline, advisoryPolicy } from '../src/measurementAdvisory.js';
const NOW = Date.parse('2026-11-14T12:00:00Z'), DAY = 86400000;
const sample = (values = {}, days = 0) => ({ id: `day-${days}`, time: new Date(NOW - days * DAY).toISOString(), context: 'Resting', notes: '', heartRate: 70, systolic: 115, diastolic: 75, temperature: 36.6, sleep: 8, quality: 4, mood: 4, stress: 2, ...values });
const ids = entries => evaluateMeasurements(entries, NOW).flags.map(f => f.id);

test('severe pressure uses either component, strict boundaries and higher priority without duplicate pressure flags', () => {
  assert.ok(ids([sample({ systolic: 181, diastolic: 75 })]).includes('pressure-urgent'));
  assert.ok(ids([sample({ systolic: 115, diastolic: 121 })]).includes('pressure-urgent'));
  const boundary = ids([sample({ systolic: 180, diastolic: 120 })]);
  assert.ok(!boundary.includes('pressure-urgent')); assert.ok(boundary.includes('pressure-review'));
  const result = evaluateMeasurements([sample({ systolic: 181, sleep: 5 })], NOW);
  assert.equal(result.flags[0].priority, 'urgent'); assert.equal(result.urgentCount, 1);
  assert.ok(!result.flags.some(f => f.id === 'pressure-review'));
});
test('temperature, resting pulse and sleep boundaries are explicit', () => {
  assert.ok(ids([sample({ temperature: 34.9 })]).includes('temperature-low'));
  assert.ok(!ids([sample({ temperature: 35 })]).includes('temperature-low'));
  assert.ok(ids([sample({ temperature: 38 })]).includes('temperature-high'));
  assert.ok(!ids([sample({ temperature: 37.9 })]).includes('temperature-high'));
  for (const heartRate of [60, 100]) assert.ok(!ids([sample({ heartRate })]).includes('pulse-reference'));
  for (const heartRate of [59, 101]) assert.ok(ids([sample({ heartRate })]).includes('pulse-reference'));
  assert.ok(ids([sample({ sleep: 0 })]).includes('sleep-duration'));
  assert.ok(!ids([sample({ sleep: 7 })]).includes('sleep-duration'));
});
test('unknown, invalid and unpaired values do not trigger clinical reference rules', () => {
  const result = evaluateMeasurements([sample({ heartRate: null, systolic: 190, diastolic: null, temperature: NaN, sleep: undefined, stress: Infinity, mood: 0, quality: '1' })], NOW);
  assert.deepEqual(result.flags, []);
  assert.ok(result.missing.includes('Body temperature'));
  assert.ok(!ids([sample({ temperature: 200 })]).includes('temperature-high'));
});
test('context skips routine resting checks but not very high pressure or temperature', () => {
  const result = ids([sample({ context: 'After exercise', heartRate: 120, systolic: 150, diastolic: 90 })]);
  assert.ok(!result.includes('pulse-reference')); assert.ok(!result.includes('pressure-review'));
  assert.ok(ids([sample({ context: 'After exercise', systolic: 185 })]).includes('pressure-urgent'));
});
test('latest record only, freshness and synthetic exclusions prevent misleading current warnings', () => {
  assert.deepEqual(ids([sample(), sample({ temperature: 39 }, 1)]), []);
  const stale = evaluateMeasurements([sample({ temperature: 39 }, 2)], NOW);
  assert.equal(stale.fresh, false); assert.deepEqual(stale.flags, []);
  assert.equal(evaluateMeasurements([sample({}, -1)], NOW).entry, null);
  assert.equal(evaluateMeasurements([sample({ source: 'camera', temperature: 39 })], NOW).entry, null);
  assert.equal(evaluateMeasurements([sample({ simulated: true, temperature: 39 })], NOW).entry, null);
  const oneDay = evaluateMeasurements([sample({ temperature: 39 }, 1)], NOW);
  assert.equal(oneDay.fresh, true);
  assert.equal(evaluateMeasurements([sample({ temperature: 39 }, 1)], NOW + 1).fresh, false);
});
test('informal scales trigger review prompts, not invented diagnoses', () => {
  const flags = evaluateMeasurements([sample({ stress: 4, mood: 2, quality: 2 })], NOW).flags;
  assert.equal(flags.filter(f => f.kind === 'self-report').length, 3);
  assert.ok(flags.every(f => f.priority === 'review'));
});
test('personal model learns from distinct prior dates and flags unusual readings with evidence', () => {
  const history = Array.from({ length: 8 }, (_, i) => sample({}, i + 1));
  const target = sample({ heartRate: 95 });
  const model = fitPersonalBaseline([...history, target], target, NOW).find(m => m.key === 'heartRate');
  assert.equal(model.center, 70); assert.equal(model.spread, 5); assert.equal(model.sampleCount, 8); assert.equal(model.ready, true);
  const result = evaluateMeasurements([target, ...history], NOW);
  const flag = result.flags.find(f => f.id === 'model-heartRate');
  assert.equal(flag.kind, 'model'); assert.equal(flag.model.deviation, 5);
  assert.equal(flag.model.evidence.length, 8); assert.ok(!result.flags.some(f => f.id === 'pulse-reference'));
  assert.ok(!ids([sample(), ...history]).includes('model-heartRate'));
});
test('model resists outliers and never weights duplicate days, other contexts, future or target-day records', () => {
  const target = sample({ heartRate: 95 });
  const history = Array.from({ length: 8 }, (_, i) => sample(i === 0 ? { heartRate: 300 } : {}, i + 1));
  const extras = [sample({ id: 'duplicate', heartRate: 310 }, 2), sample({ context: 'After exercise' }, 9), sample({}, 31), sample({}, -1), sample({ id: 'same-day', time: new Date(NOW - 1000).toISOString() })];
  const model = fitPersonalBaseline([...history, ...extras], target, NOW).find(m => m.key === 'heartRate');
  assert.equal(model.sampleCount, 8); assert.equal(model.center, 70); assert.equal(model.spread, 5);
  const short = fitPersonalBaseline(history.slice(0, 7), target, NOW).find(m => m.key === 'heartRate');
  assert.equal(short.ready, false); assert.equal(short.center, null);
});
test('latest day is never included in fitting, input is unchanged, and removing training records returns to learning', () => {
  const history = Array.from({ length: 8 }, (_, i) => sample({}, i + 1));
  const records = [sample({ heartRate: 150 }), ...history], copy = JSON.stringify(records);
  evaluateMeasurements(records, NOW); assert.equal(JSON.stringify(records), copy);
  const result = evaluateMeasurements(records.slice(0, 8), NOW);
  assert.equal(result.models.find(m => m.key === 'heartRate').ready, false);
  assert.ok(!result.flags.some(f => f.kind === 'model'));
  assert.equal(advisoryPolicy.minimumDays, 8);
});
