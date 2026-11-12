import React from 'react';
import { useState } from 'react';
import { contexts, definitions, filterEntries, formatDate } from '../health.js';
export default function TrendChart({ entries }) {
 const [name,setName]=useState('heartRate');
 const [filters,setFilters]=useState({from:'',to:'',context:''});
 const points=filterEntries(entries,filters).filter(e=>e[name]!==null).slice(0,100).reverse();
 const definition=definitions.find(d=>d[0]===name);
 const values=points.map(e=>e[name]),low=Math.min(...values)-1,high=Math.max(...values)+1;
 const first=Date.parse(points[0]?.time),last=Date.parse(points.at(-1)?.time);
 const coords=points.map((e,i)=>[30+320*(last===first?i/(points.length-1):(Date.parse(e.time)-first)/(last-first)),145-110*(e[name]-low)/(high-low)]);
 const change=(key,value)=>setFilters(current=>({...current,[key]:value}));
 return <section className="panel"><p className="eyebrow">THE BIGGER PICTURE</p><h2>Recent trends</h2>
 <label>Indicator<select value={name} onChange={e=>setName(e.target.value)}>{definitions.map(([key,label,unit])=><option key={key} value={key}>{label} · {unit}</option>)}</select></label>
 <div className="chart-filters"><label>From<input type="date" value={filters.from} onChange={e=>change('from',e.target.value)}/></label><label>Through<input type="date" value={filters.to} onChange={e=>change('to',e.target.value)}/></label></div>
 <label>Measurement context<select value={filters.context} onChange={e=>change('context',e.target.value)}><option value="">All contexts</option>{contexts.map(c=><option key={c}>{c}</option>)}</select></label>
 <button type="button" onClick={()=>setFilters({from:'',to:'',context:''})}>Reset filters</button>
 <div id="chart">{filters.from&&filters.to&&filters.from>filters.to?<p className="empty">The start date must be on or before the end date.</p>:points.length<2?<p className="empty">At least two readings in this date range and context are needed for a trend.</p>:<>
 <svg viewBox="0 0 380 175" role="img" aria-label={`${definition[1]} · ${definition[2]} trend. Dated values are listed below.`}><path d="M30 25V145H350" fill="none" stroke="#d2ded3"/><polyline points={coords.map(p=>p.join(',')).join(' ')} fill="none" stroke="#527a45" strokeWidth="3"/>{coords.map(([x,y],i)=><g key={points[i].id}><circle cx={x} cy={y} r="4" fill="#527a45"><title>{formatDate(points[i].time)}: {values[i]} · {points[i].context}</title></circle><text x={x} y={y-10} textAnchor="middle" fontSize="11">{points.length<=10?values[i]:''}</text></g>)}</svg>
 <details><summary>View dated readings</summary><ul>{points.map(e=><li key={e.id}>{formatDate(e.time)}: {e[name]} · {definition[2]} · {e.context}</li>)}</ul></details></>}</div>
 <p className="hint">Up to 100 most recent readings within the selected dates and context. Dates use your device timezone. Compare measurements taken in similar conditions. Trends alone cannot establish health status.</p></section>;
}
