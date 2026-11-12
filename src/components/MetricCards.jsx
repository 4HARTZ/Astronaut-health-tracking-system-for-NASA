import React from 'react';
import { definitions, formatDate } from '../health.js';
export default function MetricCards({ entries }) {
 const latest=entries[0];
 return <section><div className="heading"><h2>Latest check-in</h2><span>{latest ? formatDate(latest.time) : 'No readings yet'}</span></div>
 <div id="metrics">{definitions.filter(([name])=>!['diastolic','quality'].includes(name)).map(([name,label,unit])=>{
  const value=name==='systolic' ? (latest?.systolic==null?null:`${latest.systolic} / ${latest.diastolic}`) : latest?.[name];
  return <article className="metric" key={name}><h3>{name==='systolic'?'Blood pressure':label}</h3><strong>{value??'—'}</strong><small>{unit}</small><p>{value==null?'Not recorded':'Recorded · no clinical assessment'}</p></article>;
 })}</div></section>;
}
