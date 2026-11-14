import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8080' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'MutationObserver', 'FormData', 'File', 'Blob', 'getComputedStyle']) {
  globalThis[name] = dom.window[name];
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLElement.prototype.scrollIntoView = () => {};

const React = (await import('react')).default;
const { render, screen, fireEvent, cleanup, act } = await import('@testing-library/react');
const { default: SettingsPanel } = await import('../src/components/SettingsPanel.jsx');
const { useHealthStore } = await import('../src/store/useHealthStore.js');

afterEach(() => {
  cleanup();
  useHealthStore.setState({
    theme: 'dark',
    activeCrew: {
      id: 'vance-cdr',
      name: 'CDR. R. Vance',
      role: 'Commander',
      mission: 'Expedition 72 · ISS',
    },
  });
});

test('SettingsPanel switches themes between Dark and Light mode', async () => {
  render(React.createElement(SettingsPanel, { entries: [] }));

  assert.ok(screen.getByText('Application Settings'));
  assert.ok(screen.getByText('Dark Mode (Default)'));
  assert.ok(screen.getByText('Light Mode'));

  // Switch to Light mode
  await act(async () => {
    fireEvent.click(screen.getByText('Light Mode'));
  });
  assert.equal(useHealthStore.getState().theme, 'light');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'light');

  // Switch back to Dark mode
  await act(async () => {
    fireEvent.click(screen.getByText('Dark Mode (Default)'));
  });
  assert.equal(useHealthStore.getState().theme, 'dark');
  assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
});

test('SettingsPanel updates Crew Profile', async () => {
  render(React.createElement(SettingsPanel, { entries: [] }));

  // Switch to Profile tab
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Crew Profile/i }));
  });

  assert.ok(screen.getByLabelText(/Call-Sign \/ Name/i));
  const input = screen.getByLabelText(/Call-Sign \/ Name/i);
  assert.equal(input.value, 'CDR. R. Vance');

  await act(async () => {
    fireEvent.change(input, { target: { value: 'CDR. Sarah Connor' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Crew Profile/i }));
  });

  assert.equal(useHealthStore.getState().activeCrew.name, 'CDR. Sarah Connor');
  assert.ok(screen.getByText(/Profile updated successfully/i));
});
