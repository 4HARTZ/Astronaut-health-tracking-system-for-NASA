import React from 'react';
import { Activity, HeartPulse, Moon, Smile, Thermometer, Wind } from 'lucide-react';
import { definitions, formatDate } from '../health.js';

const metricIcons = {
  heartRate: HeartPulse,
  systolic: Activity,
  temperature: Thermometer,
  sleep: Moon,
  mood: Smile,
  stress: Wind,
};

function MiniTrend({ entries, name, label }) {
  const samples = entries.filter((entry) => Number.isFinite(entry[name])).slice(0, 8).reverse();
  if (samples.length < 2) return null;
  const values = samples.map((entry) => entry[name]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = 2 + (index / (values.length - 1)) * 76;
    const y = 18 - ((value - min) / range) * 13;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="metric-trend" title={`${samples.length} recent readings; open Trends for dated values`}>
      <svg viewBox="0 0 80 22" role="img" aria-label={`${label} relative trend across ${samples.length} recent readings`}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{samples.length} readings · <a href="#trends">view trend</a></span>
    </div>
  );
}

export default function MetricCards({ entries }) {
  const visibleMetrics = definitions.filter(([name]) => !['diastolic', 'quality'].includes(name));

  return (
    <section aria-labelledby="metrics-title">
      <div className="heading">
        <div>
          <p className="eyebrow">RECORDED MEASUREMENTS</p>
          <h2 id="metrics-title">Health metrics</h2>
        </div>
        <span>{entries.length ? `${entries.length} saved check-in${entries.length === 1 ? '' : 's'}` : 'Your readings will appear here'}</span>
      </div>
      <div id="metrics">
        {visibleMetrics.map(([name, label, unit]) => {
          const record = entries.find((entry) => entry[name] !== null && entry[name] !== undefined);
          const Icon = metricIcons[name] || Activity;
          const value = !record
            ? null
            : name === 'systolic'
              ? `${record.systolic} / ${record.diastolic}`
              : record[name];
          const title = name === 'systolic' ? 'Blood pressure' : label;
          const detail = name === 'systolic' ? 'Systolic / diastolic' : unit;

          return (
            <article className="metric" key={name}>
              <div className="metric-title"><span>{title}</span><Icon aria-hidden="true" /></div>
              <div className="metric-reading">
                <strong>{value ?? '—'}</strong>
                {value !== null && <small>{detail}</small>}
              </div>
              <p>{record ? `Recorded ${formatDate(record.time)} · ${record.context}` : 'Awaiting a measurement'}</p>
              {record && <MiniTrend entries={entries} name={name} label={title} />}
            </article>
          );
        })}
      </div>
      <p className="metric-disclaimer">Check-ins are self-reported. Readings are shown as recorded; this prototype does not assess clinical status.</p>
    </section>
  );
}
