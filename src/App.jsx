import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { formatDate, loadRecords } from './health.js';
import { initializeLocalRepository } from './storage/repository.js';
import PwaStatus from './components/PwaStatus.jsx';
import DailyChecklist, { SavedResults } from './components/DailyChecklist.jsx';
import CheckInForm from './components/CheckInForm.jsx';
import MetricCards from './components/MetricCards.jsx';
import TrendChart from './components/TrendChart.jsx';
import InsightsPanel from './components/InsightsPanel.jsx';
import ChangesPanel from './components/ChangesPanel.jsx';
import HealthReport from './components/HealthReport.jsx';
import RecordHistory from './components/RecordHistory.jsx';
import BreathingGuide from './components/BreathingGuide.jsx';

export default function App({ repositoryFactory=initializeLocalRepository }){
 const [saved,setSaved]=useState(null),[entries,setEntries]=useState([]);
 const [editing,setEditing]=useState(null),[formVersion,setFormVersion]=useState(0);
 const [message,setMessage]=useState(''),[recordMessage,setRecordMessage]=useState('');
 const [loading,setLoading]=useState(true),[storageError,setStorageError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(0);
 const repoRef=useRef(null),revisions=useRef({}),editingRevision=useRef(null);
 const disabled=loading||Boolean(storageError)||busy;
 async function refresh(repo=repoRef.current){
  const snapshot=await repo.snapshot();setEntries(snapshot.entries);revisions.current=snapshot.revisions;setPending(snapshot.pending);
 }
 useEffect(()=>{
  let cancelled=false,repo,unsubscribe;
  (async()=>{
   try{
    repo=await repositoryFactory();if(cancelled){repo.close?.();return;}
    const snapshot=await repo.snapshot();if(cancelled){repo.close?.();return;}
    repoRef.current=repo;setEntries(snapshot.entries);revisions.current=snapshot.revisions;setPending(snapshot.pending);setLoading(false);
    unsubscribe=repo.subscribe?.(()=>{refresh(repo).catch(()=>setStorageError('Could not refresh device storage. Reload before making more changes.'));});
   }catch{
    if(cancelled)return;
    repo?.close?.();setLoading(false);setStorageError('Device storage could not be opened or migrated. Saving is disabled. Existing records were not removed. Export available records, check browser storage permissions, and reload.');
    try{setEntries(loadRecords(window.localStorage));}catch{/* malformed legacy data remains untouched */}
   }
  })();
  return ()=>{cancelled=true;unsubscribe?.();repo?.close?.();repoRef.current=null;};
 },[repositoryFactory]);
 function resetForm(){setEditing(null);editingRevision.current=null;setFormVersion(v=>v+1);}
 async function save(entry){
  if(disabled)return;setBusy(true);
  try{
   await repoRef.current.save(entry,editing?editingRevision.current:null);
   setMessage(editing?'Check-in updated on this device.':'Check-in saved on this device.');resetForm();setSaved(entry);
   try{await refresh();}catch{setStorageError('Check-in was saved, but the display could not refresh. Reload to view it.');}
  }catch(error){setMessage(`Could not save: ${error.message} Your form has been kept.`);}
  finally{setBusy(false);}
 }
 function edit(entry){if(disabled)return;editingRevision.current=revisions.current[entry.id];setSaved(null);setEditing(entry);setFormVersion(v=>v+1);setMessage('');document.querySelector('#check-in')?.scrollIntoView({behavior:'smooth'});}
 async function remove(entry){
  if(disabled||!window.confirm(`Delete the check-in from ${formatDate(entry.time)}? Export a backup first if needed.`))return;
  setBusy(true);
  try{
   await repoRef.current.remove(entry.id,revisions.current[entry.id]);
   if(editing?.id===entry.id)resetForm();if(saved?.id===entry.id)setSaved(null);setRecordMessage('Check-in deleted.');
   try{await refresh();}catch{setStorageError('Deletion was saved, but the display could not refresh. Reload to view it.');}
  }catch(error){setRecordMessage(`Could not delete: ${error.message} Records were not changed.`);}
  finally{setBusy(false);}
 }
 async function importRecords(file){
  if(disabled)return;setBusy(true);
  try{
   if(file.size>5*1024*1024)throw Error('Choose a JSON backup smaller than 5 MB.');
   const result=await repoRef.current.importBackup(JSON.parse(await file.text()));
   setRecordMessage(`Imported ${result.added} records. Skipped ${result.duplicates} duplicates and ${result.conflicts} conflicts. Existing records were preserved.`);
   try{await refresh();}catch{setStorageError('Import was saved, but the display could not refresh. Reload to view it.');}
  }catch(error){setRecordMessage(error instanceof SyntaxError?'Invalid JSON file. No records were imported.':`Import failed: ${error.message}`);}
  finally{setBusy(false);}
 }
 return <><header><strong>◉ ORBIT <small>CREW HEALTH</small></strong><span>LOCAL PROTOTYPE</span></header><main>
 <section className="hero"><p className="eyebrow">YOUR DAILY HEALTH COMPANION</p><h1>A small check-in.<br/>A clearer picture.</h1><p>Record your measurements, reflect on how you feel, and see what changes over time.</p><a className="button" href="#check-in">Start check-in ↗</a><a className="breathing-shortcut" href="#breathing-guide">Take a breathing break ↗</a></section>
 <aside><strong>Your records stay on this device.</strong><p>Browser storage is unencrypted. Export a backup before clearing browser data. Use synthetic data while testing.</p><p>This prototype does not diagnose conditions, recommend treatment, or provide medical alerts.</p></aside>
 <PwaStatus/><section className="panel storage-status" aria-label="Device storage"><strong>Local-only workspace</strong><p role="status">{loading?'Opening device records…':storageError||'Records are saved on this device. Accounts and cloud synchronization are not connected.'}</p>{!loading&&!storageError&&<p className="hint">{pending} local change{pending===1?'':'s'} in the device journal. No records have been uploaded. Storage is not encrypted yet.</p>}</section><DailyChecklist entries={entries}/><MetricCards entries={entries}/><div className="workspace"><>{saved?<SavedResults entry={saved} onEdit={edit} onNew={()=>{setSaved(null);resetForm();setMessage('');}}/>:<CheckInForm key={formVersion} entry={editing} disabled={disabled} onSave={save} onCancel={()=>{resetForm();setMessage('Edit cancelled.');}} message={message} setMessage={setMessage}/>}</><div id="trends"><TrendChart entries={entries}/><ChangesPanel entries={entries}/><InsightsPanel entries={entries}/>
 <section className="panel info"><h2>Understand your data</h2><p>Heart rate and blood pressure offer cardiovascular context. Sleep, mood, and stress help you reflect on wellbeing.</p><p>Basic readings cannot measure bone density, radiation exposure, or immune function. These require dedicated assessments.</p><a href="https://www.nasa.gov/hrp/risks/" target="_blank" rel="noopener noreferrer">Explore NASA’s health research ↗</a></section></div></div>
 <RecordHistory entries={entries} disabled={disabled} onEdit={edit} onDelete={remove} onImport={importRecords} message={recordMessage}/>
 <BreathingGuide/>
 <HealthReport entries={entries}/>
 </main><footer>Built by 4HARTZ · Early prototype · No medical alert system configured</footer></>;
}
