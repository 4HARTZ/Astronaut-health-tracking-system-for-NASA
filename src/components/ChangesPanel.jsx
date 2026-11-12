import React from 'react';
import { formatDate, observations } from '../health.js';
export default function ChangesPanel({ entries }) {
 const changes=observations(entries);
 return <section className="panel info"><h2>What changed?</h2><p className="hint">Compares the most recent available pair per indicator in the same measurement context. These are observations, not medical judgments.</p><div id="changes">{changes.length?<ul className="observations">{changes.map(({name,label,unit,latest,previous,delta})=><li key={name}><strong>{label}:</strong> {previous[name]} → {latest[name]} ({delta===0?'unchanged':`${delta>0?'+':''}${delta}`}) · {unit}<br/><span className="hint">{formatDate(previous.time)} → {formatDate(latest.time)} · {latest.context}</span></li>)}</ul>:<p className="empty">Add two readings at different times in the same context to see changes.</p>}</div></section>;
}
