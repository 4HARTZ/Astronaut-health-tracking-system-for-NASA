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

test('warning panel separates urgent reference checks from learning and shows dated reasons', () => {
  const current = { ...entry, id: 'urgent', time: new Date().toISOString(), systolic: 185, diastolic: 80, sleep: 8 };
  render(React.createElement(Advisory, { entries: [current] }));
  assert.ok(screen.getByRole('heading', { name: 'Measurement advisories & warnings' }));
  assert.ok(screen.getByRole('heading', { name: 'Very high recorded blood pressure — urgent review' }));
  assert.ok(screen.getByRole('heading', { name: 'Personal model: Learning your baseline' }));
  assert.ok(screen.getByRole('link', { name: /AHA: very high blood pressure/ }));
  assert.match(document.body.textContent, /Record urgent/);
});

test('summary evaluates newly saved readings immediately, opens panel and expires stale flags on focus', async t => {
  const { WarningSummary, useMeasurementAdvisory } = await import('../src/components/MeasurementWarnings.jsx');
  let clock = Date.parse('2026-11-14T12:00:00Z');
  t.mock.method(Date, 'now', () => clock);
  let opened = false;
  function Harness({ entries }) {
    const result = useMeasurementAdvisory(entries);
    return React.createElement(WarningSummary, { result, onOpen: () => { opened = true; } });
  }
  const view = render(React.createElement(Harness, { entries: [] }));
  clock += 1000;
  const saved = { ...entry, time: new Date(clock).toISOString(), systolic: 185, diastolic: 80 };
  view.rerender(React.createElement(Harness, { entries: [saved] }));
  assert.ok(screen.getByRole('region', { name: 'Measurement warning summary' }));
  fireEvent.click(screen.getByRole('button', { name: /Open advisories/ })); assert.equal(opened, true);
  clock += 25 * 3600000;
  fireEvent(window, new window.Event('focus'));
  assert.equal(screen.queryByRole('region', { name: 'Measurement warning summary' }), null);
});
