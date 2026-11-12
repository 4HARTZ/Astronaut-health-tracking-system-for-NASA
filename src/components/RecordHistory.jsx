import React from 'react';
import { useRef } from 'react';
import { definitions, formatDate } from '../health.js';
export default function RecordHistory({entries,disabled,onEdit,onDelete,onImport,message}){
 const fileRef=useRef(null);
 function exportRecords(){
  const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`orbit-health-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="panel history"><div className="heading"><h2>Check-in history</h2><div><button type="button" disabled={!entries.length} onClick={exportRecords}>Export JSON ↓</button>{' '}<button type="button" disabled={disabled} onClick={()=>fileRef.current.click()}>Import backup ↑</button><input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Backup file" onChange={async e=>{const input=e.currentTarget,file=input.files[0];if(file)await onImport(file);input.value='';}}/></div></div>
 <p className="hint">Import merges new records. Existing IDs are preserved; conflicting records are skipped. Export a backup before moving devices.</p><p role="status" aria-live="polite">{message}</p>
 <div id="history">{entries.length?<table><thead><tr><th>Measured</th>{definitions.map(([name,label,unit])=><th key={name}>{label}<br/>{unit}</th>)}<th>Context &amp; notes</th><th>Actions</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td>{formatDate(e.time)}</td>{definitions.map(([name])=><td key={name}>{e[name]??'—'}</td>)}<td>{e.context}{'\n'}{e.notes}</td><td><button type="button" disabled={disabled} onClick={()=>onEdit(e)}>Edit</button>{' '}<button type="button" disabled={disabled} onClick={()=>onDelete(e)}>Delete</button></td></tr>)}</tbody></table>:<p className="empty">Your first check-in starts your history. No sample measurements have been added.</p>}</div></section>;
}
