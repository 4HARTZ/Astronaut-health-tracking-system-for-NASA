import React from 'react';
import { contexts, definitions, formatDate, localInputTime, ratings, valid } from '../health.js';

export default function CheckInForm({ entry, disabled, onSave, onCancel, message, setMessage }) {
  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const timestamp = Date.parse(data.get('time'));
    if (!Number.isFinite(timestamp) || timestamp > Date.now()) {
      setMessage('Choose a valid measurement time that is not in the future.'); return;
    }
    const record = { id: entry?.id ?? crypto.randomUUID(), time: new Date(timestamp).toISOString(), context: data.get('context'), notes: data.get('notes').trim() };
    definitions.forEach(([name]) => { record[name] = data.get(name) === '' ? null : Number(data.get(name)); });
    if ((record.systolic === null) !== (record.diastolic === null)) {
      setMessage('Enter both blood-pressure values, or leave both blank.'); return;
    }
    if (!definitions.some(([name]) => record[name] !== null) && !record.notes) {
      setMessage('Add at least one measurement, rating, or symptom note.'); return;
    }
    if (!valid(record)) { setMessage('Check the entered values.'); return; }
    onSave(record);
  }
  return <section className="panel" id="check-in">
    <p className="eyebrow">TAKE A MOMENT</p><h2>{entry ? 'Edit check-in' : 'Daily check-in'}</h2>
    <p>Enter available measurements. Leave unmeasured values blank.</p>
    {entry && <p className="hint">Editing check-in from {formatDate(entry.time)}.</p>}
    <form onSubmit={submit}>
      <label>Measurement time<input autoFocus={Boolean(entry)} name="time" type="datetime-local" step="1" defaultValue={entry ? localInputTime(entry.time) : localInputTime()} required /></label>
      <div id="fields">{definitions.map(([name, label, unit, min, max, step]) => <label key={name}>{label} · {unit}
        {ratings[name] ? <select name={name} defaultValue={entry?.[name] ?? ''}><option value="">Not recorded</option>{ratings[name].map((text, i) => <option key={text} value={i + 1}>{i + 1} · {text}</option>)}</select>
          : <input name={name} type="number" min={min} max={max} step={step} inputMode="decimal" defaultValue={entry?.[name] ?? ''} />}
      </label>)}</div>
      <label>Context<select name="context" defaultValue={entry?.context ?? 'Resting'}>{contexts.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Symptoms or notes<textarea name="notes" maxLength="2000" rows="3" defaultValue={entry?.notes ?? ''} /></label>
      <p className="hint">Follow your approved device and mission measurement procedure. Input limits catch entry errors; they are not medical safety limits.</p>
      <button className="button" disabled={disabled}>{entry ? 'Update check-in' : 'Save check-in ↗'}</button>{entry && <> <button type="button" onClick={onCancel}>Cancel edit</button></>}
      <p role="status" aria-live="polite">{message}</p>
    </form>
  </section>;
}
