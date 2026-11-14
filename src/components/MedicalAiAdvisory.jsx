import React, { useMemo, useState } from 'react';
import { latestReview, illustrativeCurve } from '../advisory.js';
import { formatDate } from '../health.js';
import MeasurementWarnings, { useMeasurementAdvisory } from './MeasurementWarnings.jsx';

function Demonstration({ entry }) {
  const [sleep, setSleep] = useState(Number.isFinite(entry?.sleep) ? entry.sleep : 8);
  const [quality, setQuality] = useState(Number.isFinite(entry?.quality) ? entry.quality : 3);
  const points = useMemo(() => illustrativeCurve(sleep, quality), [sleep, quality]);
  return <section className="panel space-y-4" aria-labelledby="simulation-heading">
    <h3 id="simulation-heading">Illustrative sleep simulator</h3>
    <p>Unvalidated demonstration · arbitrary units. This formula is not a trained AI model or SAFTE implementation. It does not predict fatigue, health, alertness, or fitness for duty. It provides no EVA clearance or treatment advice.</p>
    <p className="hint">Controls start from the latest saved sleep and quality when available; otherwise they use example values of 8 hours and 3/5. Changing them never changes a saved record.</p>
    <label>Example sleep duration: {sleep} hours<input type="range" min="0" max="24" step="0.5" value={sleep} onChange={e => setSleep(Number(e.target.value))} /></label>
    <label>Example sleep quality: {quality}/5<input type="range" min="1" max="5" step="1" value={quality} onChange={e => setQuality(Number(e.target.value))} /></label>
    <svg viewBox="0 0 480 130" role="img" aria-label="Illustrative 24-hour curve in arbitrary units; not a prediction" className="w-full max-w-3xl">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points.map(p => `${p.hour * 20},${110 - p.value}`).join(' ')} />
      <text x="0" y="128" fill="currentColor" fontSize="10">00:00</text><text x="435" y="128" fill="currentColor" fontSize="10">23:00</text>
    </svg>
    <details><summary>Curve values and assumptions</summary>
      <p>A fixed cosine wave is combined with the two example inputs. Its coefficients are product demonstration choices, not measured effects. Times are labels for the example, not your sleep schedule.</p>
      <table><caption>Illustrative values, arbitrary units</caption><thead><tr><th>Hour</th><th>Value</th></tr></thead><tbody>{points.map(p => <tr key={p.hour}><td>{String(p.hour).padStart(2, '0')}:00</td><td>{p.value}</td></tr>)}</tbody></table>
    </details>
  </section>;
}

export default function MedicalAiAdvisory({ entries = [], assessment }) {
  const localAssessment = useMeasurementAdvisory(entries);
  const result = assessment ?? localAssessment;
  const { entry, readings } = latestReview(entries);
  return <section className="space-y-6" aria-labelledby="data-review-heading">
    <div className="panel">
      <h2 id="data-review-heading">Advisory &amp; warnings</h2>
      <p>Offline advisory prototype: personal pattern detection and explainable measurement flags. Review reasons and evidence before acting; no diagnosis or treatment is generated.</p>
    </div>
    <MeasurementWarnings result={result} />
    <section className="panel" aria-labelledby="latest-review-heading">
      <h3 id="latest-review-heading">Latest saved check-in</h3>
      {entry ? <>
        <p>{formatDate(entry.time)} · {entry.context}</p>
        <table><caption>Recorded values; no clinical interpretation</caption><thead><tr><th>Indicator</th><th>Recorded value</th></tr></thead><tbody>
          {readings.map(r => <tr key={r.key}><th scope="row">{r.label}</th><td>{r.value === null ? 'Not recorded' : `${r.value} ${r.unit}`}</td></tr>)}
        </tbody></table>
      </> : <p>No saved measurements yet. There is no health assessment to display.</p>}
      <p className="hint">Oxygen saturation, respiration, and perfusion are not collected by this check-in form. Demonstration monitor values are excluded.</p>
    </section>
    <Demonstration key={JSON.stringify([entry?.id, entry?.time, entry?.sleep, entry?.quality])} entry={entry} />
  </section>;
}
