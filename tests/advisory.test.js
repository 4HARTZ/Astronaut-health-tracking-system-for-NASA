import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { latestReview, illustrativeCurve } from '../src/advisory.js';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8080' });
for (const name of ['window','document','HTMLElement','Node','MutationObserver']) globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import('react')).default;
const { render, screen, fireEvent, cleanup, within } = await import('@testing-library/react');
const { default: Advisory } = await import('../src/components/MedicalAiAdvisory.jsx');
afterEach(cleanup);
const entry = { id: 'latest', time: '2026-01-02T12:00:00Z', context: 'Resting', heartRate: 72, quality: 4, sleep: 0, stress: null };

test('review uses canonical fields, preserves zero, sorts history and leaves missing readings unknown', () => {
  const result = latestReview([{ ...entry, id: 'old', time: '2026-01-01', heartRate: 60 }, entry, { ...entry, time: '2099-01-01' }]);
  assert.equal(result.entry.id, 'latest');
  assert.equal(result.readings.find(r => r.key === 'heartRate').value, 72);
  assert.equal(result.readings.find(r => r.key === 'quality').value, 4);
  assert.equal(result.readings.find(r => r.key === 'sleep').value, 0);
  assert.equal(result.readings.find(r => r.key === 'stress').value, null);
  assert.equal(latestReview([]).entry, null);
});
test('simulator rejects missing or invalid inputs rather than producing NaN output', () => {
  for (const args of [[undefined, 3], [8, NaN], [-1, 3], [8, 6]]) assert.throws(() => illustrativeCurve(...args));
  for (const point of illustrativeCurve(0, 1)) assert.ok(Number.isFinite(point.value) && point.value >= 0 && point.value <= 100);
});
test('review displays actual saved values and simulator reseeds after edits without mutating records', () => {
  const { rerender } = render(React.createElement(Advisory, { entries: [entry] }));
  assert.match(within(screen.getByRole('row', { name: /Resting heart rate/ })).getByRole('cell').textContent, /72 bpm/);
  assert.equal(screen.getByLabelText(/Example sleep duration/).value, '0');
  assert.equal(screen.getByLabelText(/Example sleep quality/).value, '4');
  fireEvent.change(screen.getByLabelText(/Example sleep duration/), { target: { value: '6' } });
  assert.equal(entry.sleep, 0);
  rerender(React.createElement(Advisory, { entries: [{ ...entry, sleep: 7, quality: 2 }] }));
  assert.equal(screen.getByLabelText(/Example sleep duration/).value, '7');
  assert.equal(screen.getByLabelText(/Example sleep quality/).value, '2');
  assert.doesNotMatch(document.body.textContent, /ALL PARAMETERS NOMINAL|GO FOR EVA|Clinical Guidelines:/);
});
test('empty review reports no assessment and labels simulation explicitly', () => {
  render(React.createElement(Advisory));
  assert.ok(screen.getByText(/No saved measurements yet/));
  assert.ok(screen.getByText(/Unvalidated demonstration/));
  assert.equal(screen.getByLabelText(/Example sleep duration/).value, '8');
});
