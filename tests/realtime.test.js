import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8080' });
for (const name of ['window','document','HTMLElement','Node','MutationObserver']) globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = (await import('react')).default;
const { render, screen, fireEvent, act, cleanup, within } = await import('@testing-library/react');
const { default: Monitor } = await import('../src/components/RealtimeMonitor.jsx');
const { useHealthStore } = await import('../src/store/useHealthStore.js');
afterEach(cleanup);
function bridge() {
  const listeners = new Map(), calls = [];
  const emit = (name, payload) => listeners.get(name)?.({ payload });
  return { listeners, calls, emit, api: {
    listen: async (name, fn) => { listeners.set(name, fn); return () => listeners.delete(name); },
    invoke: async name => {
      calls.push(name);
      if (name === 'rppg_start') {
        assert.ok(listeners.has('rppg-status') && listeners.has('rppg-telemetry'));
        emit('rppg-status', { state: 'active', message: 'Camera opened', simulated: false });
      }
    },
  } };
}
test('browser monitor identifies synthetic data and does not pretend to connect a camera', () => {
  render(React.createElement(Monitor, { isDesktop: false }));
  assert.equal(screen.getByRole('button', { name: 'Available in desktop app' }).disabled, true);
  assert.ok(screen.getByText('NO SENSOR CONNECTED'));
  assert.equal(useHealthStore.getState().liveVitals.simulated, true);
});
test('camera listeners precede launch; missing faces and process failures clear stale readings', async () => {
  const b = bridge();
  const view = render(React.createElement(Monitor, { isDesktop: true, cameraApi: async () => b.api }));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Connect camera' })));
  await act(async () => b.emit('rppg-telemetry', { faceDetected: true, estimatedBpm: 81, pulseValue: 2 }));
  assert.equal(useHealthStore.getState().liveVitals.heartRate, 81);
  assert.equal(useHealthStore.getState().liveVitals.spO2, null);
  await act(async () => b.emit('rppg-telemetry', { faceDetected: false }));
  assert.equal(useHealthStore.getState().liveVitals.heartRate, null);
  await act(async () => b.emit('rppg-telemetry', { faceDetected: true, estimatedBpm: 71, simulated: true }));
  assert.equal(useHealthStore.getState().liveVitals.heartRate, null);
  await act(async () => b.emit('rppg-status', { state: 'stopped', message: 'Permission denied' }));
  assert.ok(screen.getByText('Permission denied'));
  assert.ok(screen.getByRole('button', { name: 'Connect camera' }));
  view.unmount();
  assert.equal(b.listeners.size, 0);
  assert.ok(b.calls.includes('rppg_stop'));
});
test('camera startup failure is actionable and never falls back to a fake reading', async () => {
  render(React.createElement(Monitor, { isDesktop: true, cameraApi: async () => { throw Error('Python not found'); } }));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Connect camera' })));
  assert.ok(screen.getByText(/Camera unavailable: Error: Python not found/));
  assert.equal(useHealthStore.getState().liveVitals.heartRate, null);
});
