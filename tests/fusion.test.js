import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHealthIntelligence, createRyanDemoEntries, SIMULATED_LABEL } from '../src/fusion.js';

const NOW = Date.parse('2026-11-15T12:00:00.000Z');

test('empty and partial check-ins keep unavailable systems unknown', () => {
  const empty = buildHealthIntelligence([], NOW);
  assert.equal(empty.overall.score, null);
  assert.equal(empty.systems.respiratory.status, 'No data');
  const partial = buildHealthIntelligence([{
    id: 'partial', time: new Date(NOW).toISOString(), context: 'Resting', notes: '', heartRate: 72,
  }], NOW);
  assert.equal(partial.systems.cardiovascular.score, 100);
  assert.equal(partial.systems.cardiovascular.missing.includes('systolic'), true);
  assert.equal(partial.systems.respiratory.score, null);
  assert.equal(partial.overall.score, null);
});

test('Ryan demo entries are dated, synthetic, and produce distinct system results', () => {
  const records = createRyanDemoEntries(NOW);
  assert.equal(records.length, 4);
  assert.ok(records.every(record => record.simulated && record.notes.includes(SIMULATED_LABEL)));
  assert.equal(new Set(records.map(record => record.time)).size, 4);
  const result = buildHealthIntelligence(records, NOW);
  assert.equal(result.systems.cardiovascular.status, 'Good');
  assert.equal(result.systems.respiratory.status, 'Good');
  assert.equal(result.systems.recovery.status, 'Attention');
  assert.equal(result.systems.hydration.status, 'Attention');
  assert.equal(result.overall.monitored, 4);
});

test('a measurement older than seven days is identified as outdated and excluded from overall score', () => {
  const old = createRyanDemoEntries(NOW).map(record => ({ ...record, time: new Date(NOW - 9 * 86_400_000).toISOString(), submittedAt: new Date(NOW - 9 * 86_400_000).toISOString() }));
  const result = buildHealthIntelligence(old, NOW);
  assert.equal(result.systems.cardiovascular.status, 'Outdated');
  assert.equal(result.systems.cardiovascular.ageDays, 9);
  assert.equal(result.overall.score, null);
});

test('a new cardiovascular submission resets only its own timer', () => {
  const priorRespiratory = {
    id: 'resp', time: new Date(NOW - 8 * 86_400_000).toISOString(), submittedAt: new Date(NOW - 8 * 86_400_000).toISOString(),
    context: 'Resting', notes: '', spO2: 98,
  };
  const newCardio = {
    id: 'cardio', time: new Date(NOW - 60_000).toISOString(), submittedAt: new Date(NOW).toISOString(),
    context: 'Resting', notes: '', heartRate: 70,
  };
  const result = buildHealthIntelligence([newCardio, priorRespiratory], NOW);
  assert.equal(result.systems.cardiovascular.ageDays, 0);
  assert.equal(result.systems.respiratory.ageDays, 8);
  assert.equal(result.systems.respiratory.status, 'Outdated');
});
