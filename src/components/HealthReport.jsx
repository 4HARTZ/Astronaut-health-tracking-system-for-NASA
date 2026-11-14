import React, { useRef, useState } from 'react';
import { contexts, definitions, filterEntries, formatDate, observations, sortEntries } from '../health.js';
import { pdf } from '@react-pdf/renderer';
import FlightSurgeonPdfDocument from './FlightSurgeonPdfDocument.jsx';
import { FileDown, Printer, FileText, CheckCircle2 } from 'lucide-react';

export default function HealthReport({ entries }) {
  const [filters, setFilters] = useState({ from: '', to: '', context: '' });
  const [label, setLabel] = useState('');
  const [includeNotes, setIncludeNotes] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const previewRef = useRef(null);

  function change(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setReport(null);
    setError('');
  }

  function generate(event) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setError('Choose a start date on or before the end date.');
      setReport(null);
      return;
    }
    const records = sortEntries(filterEntries(entries, filters));
    if (!records.length) {
      setError('No saved check-ins match this report range. Choose other dates or add a check-in.');
      setReport(null);
      return;
    }
    setReport({
      records,
      generated: new Date().toISOString(),
      filters: { ...filters },
      label: label.trim(),
      includeNotes,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setError('');
  }

  async function handleExportPdf() {
    if (!report) return;
    setIsGeneratingPdf(true);
    try {
      const doc = <FlightSurgeonPdfDocument report={report} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanLabel = report.label ? report.label.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Briefing';
      link.download = `NASA-Flight-Surgeon-${cleanLabel}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Failed to generate Flight Surgeon PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const changes = report ? observations(report.records) : [];

  return (
    <section className="panel report-panel" id="health-report">
      <div className="report-controls">
        <p className="eyebrow">PREPARE FOR REVIEW</p>
        <h2>Health report</h2>
        <p>
          Create a readable snapshot of saved check-ins. Review it here, then print or choose “Save as PDF” in your browser’s print dialog. Nothing is uploaded or sent.
        </p>

        <form onSubmit={generate}>
          <label>
            Crew member or report label (optional)
            <input
              value={label}
              maxLength="100"
              onChange={(e) => {
                setLabel(e.target.value);
                setReport(null);
              }}
              placeholder="e.g. Crew member A · Mission day 12"
            />
          </label>

          <div className="chart-filters">
            <label>
              Report from
              <input type="date" value={filters.from} onChange={(e) => change('from', e.target.value)} />
            </label>
            <label>
              Report through
              <input type="date" value={filters.to} onChange={(e) => change('to', e.target.value)} />
            </label>
          </div>

          <label>
            Report context
            <select value={filters.context} onChange={(e) => change('context', e.target.value)}>
              <option value="">All contexts</option>
              {contexts.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => {
                setIncludeNotes(e.target.checked);
                setReport(null);
              }}
            />{' '}
            Include symptom notes in this report
          </label>

          <p className="hint">
            Blank dates include all saved dates. Filters use device local time. Unsaved form entries are excluded. The label is for this report only and is not saved to your records.
          </p>

          <div className="flow-actions flex flex-wrap gap-2 pt-2">
            <button className="button" type="submit">
              Preview health report
            </button>
            {report && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    previewRef.current?.focus();
                    window.print();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isGeneratingPdf}
                  className="button secondary flex items-center gap-1.5 !bg-cyan-950 !border-cyan-700 !text-cyan-200 hover:!bg-cyan-900"
                >
                  <FileDown className="w-4 h-4 text-cyan-400" />
                  {isGeneratingPdf ? 'Generating PDF...' : 'Download Flight Surgeon PDF'}
                </button>
              </>
            )}
          </div>
          <p role="status">{error}</p>
        </form>
      </div>

      {report && (
        <article className="health-report" ref={previewRef} tabIndex={-1} aria-label="Health report preview">
          <div className="report-title">
            <p className="eyebrow">ORBIT / CREW HEALTH</p>
            <h2>Health monitoring report</h2>
            {report.label && (
              <p>
                <strong>{report.label}</strong>
              </p>
            )}
            <p>
              Generated: {formatDate(report.generated)}
              <br />
              Timezone: {report.timezone} · all measurement times below are local
            </p>
          </div>

          <p>
            <strong>Selected dates:</strong> {report.filters.from || 'Earliest saved date'} through{' '}
            {report.filters.to || 'Latest saved date'}
            <br />
            <strong>Context:</strong> {report.filters.context || 'All contexts'}
            <br />
            <strong>Included:</strong> {report.records.length} check-in{report.records.length === 1 ? '' : 's'} ·{' '}
            {formatDate(report.records.at(-1).time)} to {formatDate(report.records[0].time)}
          </p>

          <p className="report-disclaimer">
            Self-recorded measurements for review. No diagnosis, treatment recommendation, or fitness-for-duty assessment is provided. Missing readings are unknown, not normal. Mixed contexts may not be comparable.
          </p>

          <h3>Measurement coverage</h3>
          <table className="coverage-table">
            <thead>
              <tr>
                <th>Indicator / unit</th>
                <th>Recorded</th>
                <th>Missing</th>
                <th>Latest available reading</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map(([name, title, unit]) => {
                const available = report.records.filter((e) => e[name] !== null);
                const latest = available[0];
                return (
                  <tr key={name}>
                    <th>
                      {title} · {unit}
                    </th>
                    <td>{available.length}</td>
                    <td>{report.records.length - available.length}</td>
                    <td>
                      {latest ? (
                        <>
                          {latest[name]}
                          <br />
                          <span className="hint">
                            {formatDate(latest.time)} · {latest.context}
                          </span>
                        </>
                      ) : (
                        'Not recorded'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h3>Recorded changes</h3>
          <p className="hint">
            Most recent comparable pair per indicator within this report, with the same measurement context. Differences describe readings and do not explain their cause.
          </p>
          {changes.length ? (
            <ul className="observations">
              {changes.map(({ name, label: title, unit, latest, previous, delta }) => (
                <li key={name}>
                  <strong>{title}:</strong> {previous[name]} → {latest[name]} · {unit} (
                  {delta === 0 ? 'unchanged' : `${delta > 0 ? '+' : ''}${delta}`})
                  <br />
                  <span className="hint">
                    {formatDate(previous.time)} → {formatDate(latest.time)} · {latest.context}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>Not enough comparable readings to describe a change.</p>
          )}

          <h3>Check-in details</h3>
          <p className="hint">
            Most recent first. Each check-in lists its own context and missing readings. Sleep quality/mood: higher is better. Stress: higher is more stress.
          </p>
          {report.records.map((entry) => (
            <section key={entry.id} className="report-record">
              <h4>
                {formatDate(entry.time)} · {entry.context}
              </h4>
              <dl>
                {definitions.map(([name, title, unit]) => (
                  <div key={name}>
                    <dt>{title}</dt>
                    <dd>{entry[name] === null ? 'Not recorded' : `${entry[name]} · ${unit}`}</dd>
                  </div>
                ))}
              </dl>
              {report.includeNotes && (
                <div className="report-notes">
                  <strong>Symptoms / notes</strong>
                  <p>{entry.notes || 'No notes recorded.'}</p>
                </div>
              )}
            </section>
          ))}
          {!report.includeNotes && <p>Symptom notes were excluded from this report.</p>}
          <p className="hint">
            Snapshot generated from this device’s saved records. New or edited check-ins require a new preview. Share only with your intended recipient; this report may contain personal health information.
          </p>
        </article>
      )}
    </section>
  );
}
