import React, { useMemo, useState } from 'react';
import { Activity, Brain, HeartPulse, Wind, Droplets, Bone, CircleHelp, Clock3 } from 'lucide-react';
import { buildHealthIntelligence, SIMULATED_LABEL } from '../fusion.js';

const tone = status => status === 'Good' ? 'good' : status === 'Stable' ? 'stable' : status === 'Attention' ? 'attention' : status === 'Critical' ? 'critical' : 'missing';
const regionMeta = [
  ['brain', 'Head / brain', Brain], ['heart', 'Heart / cardiovascular', HeartPulse], ['lungs', 'Lungs / respiratory', Wind],
  ['abdomen', 'Abdomen / digestive', CircleHelp], ['kidneys', 'Kidneys / urinary', Droplets], ['muscles', 'Musculoskeletal', Bone],
];
const dayText = days => days === null ? 'Never checked' : `${days} ${days === 1 ? 'day' : 'days'} since last check`;
const readingNames = { heartRate: 'Heart rate', systolic: 'Systolic', diastolic: 'Diastolic', spO2: 'SpO₂', respiration: 'Breathing', stress: 'Stress', sleep: 'Sleep', quality: 'Sleep quality', mood: 'Mood', urineColor: 'Urine colour' };
const readingUnits = { heartRate: 'bpm', systolic: 'mmHg', diastolic: 'mmHg', spO2: '%', respiration: '/min', sleep: 'h', quality: '/5', mood: '/5', stress: '/5' };
const shortDate = value => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });

function BodyMap({ regions, selected, onSelect }) {
  const setRegion = id => onSelect(id);
  return <svg className="body-map" viewBox="0 0 300 520" role="group" aria-label="Interactive front-facing body system map">
    <defs><linearGradient id="bodyFill" x1="0" x2="1"><stop stopColor="#355268"/><stop offset=".5" stopColor="#708b9c"/><stop offset="1" stopColor="#355268"/></linearGradient></defs>
    <g className="body-silhouette" aria-hidden="true">
      <circle cx="150" cy="61" r="34"/><path d="M127 99 Q150 89 173 99 L192 120 Q211 130 218 164 L230 247 Q231 260 219 262 Q208 262 204 249 L192 190 L187 267 Q184 286 196 324 L207 416 Q209 432 194 433 Q179 433 176 419 L160 337 L153 291 L147 337 L132 419 Q129 433 114 433 Q99 432 101 416 L112 324 Q124 286 121 267 L116 190 L96 249 Q92 262 81 262 Q69 260 70 247 L82 164 Q89 130 108 120 Z"/>
      <path d="M131 97 Q150 106 169 97 L165 111 L135 111 Z"/>
    </g>
    {[
      ['brain', <ellipse cx="150" cy="58" rx="19" ry="16"/>],
      ['heart', <path d="M150 172 C142 159 124 163 127 177 C129 188 150 201 150 201 C150 201 171 188 173 177 C176 163 158 159 150 172Z"/>],
      ['lungs', <g><path d="M145 142 C132 132 120 149 119 170 C118 185 130 189 143 177Z"/><path d="M155 142 C168 132 180 149 181 170 C182 185 170 189 157 177Z"/></g>],
      ['abdomen', <ellipse cx="150" cy="231" rx="28" ry="31"/>],
      ['kidneys', <g><ellipse cx="132" cy="243" rx="8" ry="13"/><ellipse cx="168" cy="243" rx="8" ry="13"/></g>],
      ['muscles', <g><path d="M111 208 Q96 223 108 251 Q119 254 121 238Z"/><path d="M189 208 Q204 223 192 251 Q181 254 179 238Z"/><path d="M129 315 L119 405 Q127 412 137 403 L149 333Z"/><path d="M171 315 L181 405 Q173 412 163 403 L151 333Z"/></g>],
    ].map(([id, shape]) => <g key={id} className={`body-region ${tone(regions[id]?.status)} ${selected === id ? 'selected' : ''}`} role="button" tabIndex="0" aria-label={`${regions[id]?.label}: ${regions[id]?.status}. Select for details`} onClick={() => setRegion(id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setRegion(id); } }}>{shape}</g>)}
    <text x="150" y="475" textAnchor="middle" className="body-map-caption">SELECT A REGION</text>
  </svg>;
}

function RegionDetails({ region }) {
  const regionDayCount = region.lastCheckedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(region.lastCheckedAt)) / 86_400_000)) : null;
  return <aside className="system-detail" aria-live="polite">
    <div className="system-detail-heading"><div><span className={`status-dot ${tone(region.status)}`} /><p className="overview-eyebrow">BODY SYSTEM</p><h3>{region.label}</h3></div><span className={`health-status ${tone(region.status)}`}>{region.status}</span></div>
    <div className="system-score"><strong>{region.score === null ? '—' : region.score}</strong><span>{region.score === null ? 'prototype score unavailable' : 'prototype points / 100'}</span></div>
    <p className="check-age"><Clock3 size={15}/>{dayText(regionDayCount)}</p>
    {region.latest && <p className="hint">Checked {shortDate(region.lastCheckedAt)}{region.latest.context ? ` · ${region.latest.context}` : ''}{shortDate(region.latest.time) !== shortDate(region.lastCheckedAt) ? ` · measured ${shortDate(region.latest.time)}` : ''}</p>}
    <h4>Readings</h4>
    {region.contributors?.length ? <ul className="contributor-list">{region.contributors.map(item => <li key={item.label}><b>{item.label}</b><strong>{item.value} {item.unit}</strong></li>)}</ul> : <p className="empty">No readings yet.</p>}
    {!!region.missing?.length && <p className="incomplete-note">Missing: {region.missing.join(', ')}</p>}
    {!!region.explanations?.length && <details className="score-notes"><summary>How the score works</summary><ul className="explanation-list">{region.explanations.map((line, index) => <li key={index}>{line}</li>)}</ul></details>}
    {region.history?.length > 0 && <details className="score-notes"><summary>Recent history</summary><ol className="system-history">{region.history.slice(0, 5).map(entry => { const historic = buildHealthIntelligence([entry]).systems[region.id]; return <li key={entry.id}><time>{shortDate(entry.time)}</time><span>{region.fields.filter(field => Number.isFinite(entry[field])).map(field => `${readingNames[field]} ${entry[field]}${readingUnits[field] ? ` ${readingUnits[field]}` : ''}`).join(' · ')}</span><small>{historic ? `${historic.status} · ${historic.score}/100` : ''}</small></li>; })}</ol></details>}
  </aside>;
}

export default function HealthIntelligence({ entries, accountId }) {
  const intelligence = useMemo(() => buildHealthIntelligence(entries), [entries]);
  const [selected, setSelected] = useState('heart');
  const region = intelligence.regions[selected];
  const systemCards = [
    intelligence.systems.cardiovascular, intelligence.systems.respiratory,
    intelligence.systems.recovery, intelligence.systems.hydration,
    { ...intelligence.overall, id: 'general', label: 'General wellness', contributors: Object.values(intelligence.systems).filter(system => system.score !== null), ageDays: null },
  ];
  const simulatedAccount = accountId === 'ryan' && entries.some(entry => entry.simulated);
  const general = intelligence.overall;
  return <section className="intelligence-shell" aria-labelledby="intelligence-title">
    <div className="intelligence-heading"><div><p className="overview-eyebrow">CREW HEALTH</p><h2 id="intelligence-title">Health overview</h2><p>Recent readings, brought together.</p></div><span className="prototype-badge"><Activity size={15}/> Prototype</span></div>
    {simulatedAccount && <div className="simulated-banner">{SIMULATED_LABEL} · Ryan’s workspace only</div>}
    <div className="wellness-overview">
      <div><p className="overview-eyebrow">OVERALL</p><h3>{general.status}</h3><p>{general.score === null ? 'Check 2 or more systems to build an overview.' : `${general.score} / 100 · Mean of fresh systems`}</p></div>
      <div className="overview-stats"><div><strong>{general.monitored}</strong><span>with data</span></div><div><strong>{general.attention}</strong><span>attention</span></div><div><strong>{general.unavailable}</strong><span>missing / old</span></div></div>
      <div className="overview-date">{general.lastAssessment ? `Updated ${shortDate(general.lastAssessment.submittedAt ?? general.lastAssessment.time)}` : 'No assessment yet'}</div>
    </div>
    <p className="fusion-method">{general.score === null ? 'Prototype score needs at least 2 fresh systems.' : `Prototype · equal-weight mean of ${general.monitored} fresh systems.`}</p>
    <div className="body-focus-grid">
      <div className="body-map-wrap"><div className="body-map-label">BODY MAP <span>Select a region</span></div><BodyMap regions={intelligence.regions} selected={selected} onSelect={setSelected}/><div className="body-legend"><span className="good">Good</span><span className="stable">Stable</span><span className="attention">Attention</span><span className="missing">No data</span></div><div className="body-region-controls" aria-label="Select a body system">{regionMeta.map(([id,label,Icon])=><button key={id} type="button" aria-pressed={selected===id} onClick={()=>setSelected(id)}><Icon size={13}/>{label}</button>)}</div></div>
      <RegionDetails region={region}/>
    </div>
    <div className="system-summary"><div className="body-map-label">SYSTEMS <span>Prototype scores</span></div><div className="system-card-grid">{systemCards.map(system => system.id === 'general' ? <div key={system.id} className={`system-summary-card ${tone(system.status)}`}><span>{system.label}</span><strong>{system.status}{system.score === null ? '' : ` · ${system.score}/100`}</strong><small>{system.contributors.length} systems</small></div> : <button key={system.id} type="button" className={`system-summary-card ${tone(system.status)}`} onClick={() => setSelected(system.region)}><span>{system.label}</span><strong>{system.status}</strong><small>{system.contributors.length} readings · {dayText(system.ageDays)}</small></button>)}</div></div>
    <div className="recent-checks"><div className="body-map-label">RECENT CHECKS <span>{Math.min(intelligence.recent.length, 4)}</span></div>{intelligence.recent.length ? <ul>{intelligence.recent.slice(0, 4).map(entry => <li key={entry.id}><time>{shortDate(entry.time)}</time><span>{['heartRate','systolic','diastolic','spO2','respiration','stress','sleep','quality','mood','urineColor'].filter(field => Number.isFinite(entry[field])).map(field => `${readingNames[field]} ${entry[field]}${readingUnits[field] ? ` ${readingUnits[field]}` : ''}`).join(' · ') || 'Notes only'}</span>{entry.simulated && <b>SIMULATED</b>}</li>)}</ul> : <p className="empty">No saved checks yet.</p>}</div>
  </section>;
}
