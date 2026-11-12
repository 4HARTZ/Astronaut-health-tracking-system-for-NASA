import React from 'react';
import { definitions, formatDate } from '../health.js';
const groups=[['Body measurements',['heartRate','systolic','diastolic','temperature']],['Sleep & recovery',['sleep','quality']],['Mood & stress',['mood','stress']]];
export default function DailyChecklist({entries}){
 const now=new Date(),today=now.toLocaleDateString();
 const daily=entries.filter(e=>new Date(e.time).toLocaleDateString()===today);
 return <section className="panel daily-checklist"><div className="heading"><div><p className="eyebrow">YOUR MISSION ROUTINE</p><h2>Today’s checklist</h2></div><span>{now.toLocaleDateString([],{dateStyle:'medium'})} · device local time</span></div><p className="hint">Based on saved readings measured today. Completion means recorded, not medically assessed.</p><div className="checklist-grid">{groups.map(([label,names])=>{
 const count=names.filter(name=>daily.some(e=>e[name]!==null)).length;
 return <div key={label}><strong>{count===names.length?'✓':'○'} {label}</strong><p>{count} of {names.length} indicators recorded</p></div>;
 })}</div><p className="hint">{daily.length?`${daily.length} check-in${daily.length===1?'':'s'} recorded today.`:'No check-ins recorded for today yet.'} Symptom notes are optional.</p><a href="#check-in">{daily.length?'Add another check-in':'Begin today’s check-in'} ↗</a></section>;
}
export function SavedResults({entry,onNew,onEdit}){
 const missing=definitions.filter(([name])=>entry[name]===null);
 return <section className="panel saved-results" id="check-in" aria-labelledby="saved-title"><p className="eyebrow">SAVED ON THIS DEVICE</p><h2 id="saved-title" tabIndex={-1} ref={node=>node?.focus()}>Check-in recorded</h2><p>{formatDate(entry.time)} · {entry.context}</p><dl className="review">{definitions.filter(([name])=>entry[name]!==null).map(([name,label,unit])=><div key={name}><dt>{label}</dt><dd>{entry[name]} · {unit}</dd></div>)}</dl>{entry.notes&&<p className="saved-notes">{entry.notes}</p>}<p className="hint">{missing.length?`Not recorded: ${missing.map(([,label])=>label).join(', ')}.`:'All eight indicators were recorded.'} No medical assessment was performed.</p><h3>Next steps</h3><ul><li>Review your recent trends and “What changed?” observations alongside the measurement context.</li><li>If you notice a concern, follow your mission’s approved crew health procedure. This app does not provide medical alerts.</li><li>Export a backup from history when you need to keep or share a copy.</li></ul><div className="flow-actions"><button type="button" onClick={()=>onEdit(entry)}>Correct this check-in</button><a href="#trends">View trends ↗</a><button type="button" onClick={onNew}>New check-in</button></div></section>;
}
