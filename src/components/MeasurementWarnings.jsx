import React, { useEffect, useId, useMemo, useState } from 'react';
import { evaluateMeasurements, advisoryPolicy, advisorySources } from '../measurementAdvisory.js';
import { formatDate } from '../health.js';

export function useMeasurementAdvisory(entries) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return useMemo(() => evaluateMeasurements(entries, Date.now()), [entries, now]);
}
export function WarningSummary({ result, onOpen }) {
  if (!result.flags.length) return null;
  return <section className={`panel warning-summary ${result.urgentCount ? 'warning-urgent' : 'warning-review'}`} aria-label="Measurement warning summary">
    <p role="status"><strong>{result.urgentCount ? 'Urgent measurement review' : 'Measurement review'}:</strong> {result.flags.length} prototype flag{result.flags.length === 1 ? '' : 's'} from the latest saved check-in. {result.urgentCount > 0 && `${result.urgentCount} urgent.`}</p>
    <button type="button" onClick={onOpen}>Open advisories &amp; warnings</button>
  </section>;
}
export default function MeasurementWarnings({ result }) {
  const ready = result.models.filter(m => m.ready).length;
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  return <section className="panel space-y-4" aria-labelledby="measurement-warnings-heading">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 id="measurement-warnings-heading">Measurement advisories &amp; warnings</h3><p className="hint">Prototype · Awaiting medical review</p></div>
      <button type="button" aria-expanded={helpOpen} aria-controls={helpId} onClick={() => setHelpOpen(open => !open)}>{helpOpen ? 'Hide guide' : 'How to use'}</button>
    </div>
    {!result.entry ? <p>No saved measurements to evaluate. Add a check-in to begin.</p> : <>
      <p>Evaluated record: {formatDate(result.entry.time)} · {result.entry.context}</p>
      {!result.fresh ? <p role="status">The latest check-in is older than {advisoryPolicy.freshnessHours} hours. Current warnings are not evaluated from stale data; add a new check-in. This time window is a product choice.</p> : result.flags.length ? <div className="space-y-3">
        {result.flags.map(flag => <article key={flag.id} className={`warning-card ${flag.priority === 'urgent' ? 'warning-urgent' : 'warning-review'}`}>
          <p className="warning-label">{flag.priority === 'urgent' ? 'Urgent review' : 'Review'} · {flag.kind === 'model' ? 'Personal baseline model' : flag.kind === 'self-report' ? 'Self-report prompt' : 'General adult reference'}</p>
          <h4>{flag.title}</h4><p>{flag.detail}</p><p><strong>Next step:</strong> {flag.next}</p>
          <details><summary>Why this was flagged</summary><p>{flag.rule}</p><p>Evidence: {formatDate(flag.evidence.time)} · {flag.evidence.context} · Record {flag.evidence.id}</p>
            {flag.model && <><p>Baseline median: {flag.model.center.toFixed(2)} {flag.model.unit}; robust spread: {flag.model.spread.toFixed(2)} {flag.model.unit}; deviation: {flag.model.deviation.toFixed(2)}. No medical probability or confidence percentage is assigned.</p><ul>{flag.model.evidence.map(e => <li key={`${e.id}-${e.time}`}>{formatDate(e.time)} · {e.value} {flag.model.unit}</li>)}</ul></>}
            {flag.source && <a href={advisorySources[flag.source].url} target="_blank" rel="noopener noreferrer">{advisorySources[flag.source].title} ↗</a>}
            <p>Rule/model version {advisoryPolicy.version} · Awaiting medical review. Reference pages need internet; the checks themselves run offline.</p>
          </details>
        </article>)}
      </div> : <p role="status">No prototype rules triggered for the available readings. This does not establish normal health or safety.</p>}
      {result.missing.length > 0 && <p className="hint">Unknown or invalid in this check-in: {result.missing.join(', ')}. Missing readings are never treated as reassuring.</p>}
      {result.entry.context !== 'Resting' && <p className="hint">Routine resting pulse and blood-pressure checks are skipped for this context. Very high blood pressure, temperature, sleep, and self-report checks still apply.</p>}
    </>}
    <section aria-labelledby="baseline-status-heading"><h4 id="baseline-status-heading">Personal model: {ready ? `${ready} indicators ready` : 'Learning your baseline'}</h4>

    </section>
    <div id={helpId} hidden={!helpOpen} className="advisory-help space-y-4">
      <h4>How to use advisories &amp; warnings</h4>
      <ol>
        <li>Open Vitals, enter available measurements, choose the correct context, and save the check-in.</li>
        <li>Return here to review flags. Open “Why this was flagged” for the recorded evidence and rule.</li>
        <li>Correct entry mistakes in History; warnings update automatically.</li>
        <li>Keep recording on separate dates. The personal model starts comparing after eight prior dates per indicator in the same context.</li>
      </ol>
      <p>Prototype · Awaiting medical review. General adult Earth-based references and a personal statistical model; no approved mission thresholds or diagnostic AI model. Flags are for review, not diagnosis or flight clearance.</p>
      <section><h4>How the personal model learns</h4>
      <p>Uses this workspace’s saved records; do not mix crew members. Fits median and robust spread from up to {advisoryPolicy.trainingDays} prior days, using at least {advisoryPolicy.minimumDays} distinct dates per indicator in the same context. The latest date is excluded from training. This is a statistical anomaly model, not a neural network or a medically trained predictor.</p>
      {result.models.length > 0 && <ul>{result.models.map(model => <li key={model.key}>{model.label}: {model.ready ? `ready (${model.sampleCount} dates)` : `learning (${model.sampleCount}/${advisoryPolicy.minimumDays} dates)`}</li>)}</ul>}
      </section>
    <section><h4>Model limitations and reference rules</h4><p>Learning your usual pattern does not establish a healthy baseline. Illness, device error, schedule changes, medication and repeated biased measurements can affect it. A stable abnormal pattern may not trigger a model flag. A changing healthy pattern may trigger one. No sensitivity, specificity, or clinical validity has been established.</p><p>Robust spread is the larger of 1.4826 × median absolute deviation and a minimum spread (pulse 5 bpm, systolic 8 mmHg, diastolic 5 mmHg, temperature 0.2 °C, sleep 0.5 h). Absolute deviation ≥3.5 spreads triggers a flag. These are prototype design choices.</p><p>Only the latest saved check-in within 24 hours is evaluated. Values are not mixed across records. Pulse: outside 60–100 bpm at rest; pressure: ≥140 systolic or ≥90 diastolic at rest, or &gt;180 systolic or &gt;120 diastolic in any context; temperature: &lt;35 or ≥38 °C; sleep: &lt;7 h; stress ≥4/5, mood or sleep quality ≤2/5. Ratings use product rules, not clinical cutoffs. Reference rules require mission-specific review.</p><p>Camera estimates, synthetic telemetry and free-text symptom interpretation are excluded. Nothing is uploaded; there are no background notifications, medication instructions, emergency dispatch, or automatic duty decisions. If unwell, follow your mission medical protocol regardless of this panel.</p></section>
    </div>
  </section>;
}
