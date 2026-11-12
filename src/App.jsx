import React from 'react';
import { useRef, useState } from 'react';
import { formatDate, loadRecords, prepareImport, saveRecords, sortEntries } from './health.js';
import DailyChecklist, { SavedResults } from './components/DailyChecklist.jsx';
import CheckInForm from './components/CheckInForm.jsx';
import MetricCards from './components/MetricCards.jsx';
import TrendChart from './components/TrendChart.jsx';
import ChangesPanel from './components/ChangesPanel.jsx';
import RecordHistory from './components/RecordHistory.jsx';

export default function App(){
 const [initial]=useState(()=>{
  try{return {entries:loadRecords(window.localStorage),error:''};}
  catch{return {entries:[],error:'Saved records could not be read. Saving is disabled to protect existing data. Check browser storage settings.'};}
 });
 const [saved,setSaved]=useState(null);
 const [entries,setEntries]=useState(initial.entries);
 const entriesRef=useRef(initial.entries);
 const [editing,setEditing]=useState(null),[formVersion,setFormVersion]=useState(0);
 const [message,setMessage]=useState(initial.error),[recordMessage,setRecordMessage]=useState('');
 const disabled=Boolean(initial.error);
 function persist(next){
  if(disabled)throw Error('Storage is unavailable. Existing records were not changed.');
  saveRecords(window.localStorage,next);entriesRef.current=next;setEntries(next);
 }
 function resetForm(){setEditing(null);setFormVersion(v=>v+1);}
 function save(entry){
  const next=sortEntries([...entriesRef.current.filter(e=>e.id!==entry.id),entry]);
  try{persist(next);setMessage(editing?'Check-in updated on this device.':'Check-in saved on this device.');resetForm();setSaved(entry);}
  catch{setMessage('Could not save: browser storage may be blocked or full. Your form has been kept.');}
 }
 function edit(entry){setSaved(null);setEditing(entry);setFormVersion(v=>v+1);setMessage('');document.querySelector('#check-in')?.scrollIntoView({behavior:'smooth'});}
 function remove(entry){
  if(!window.confirm(`Delete the check-in from ${formatDate(entry.time)}? This cannot be undone. Export a backup first if needed.`))return;
  try{persist(entriesRef.current.filter(e=>e.id!==entry.id));if(editing?.id===entry.id)resetForm();if(saved?.id===entry.id)setSaved(null);setRecordMessage('Check-in deleted.');}
  catch{setRecordMessage('Could not delete: browser storage is unavailable. Records were not changed.');}
 }
 async function importRecords(file){
  try{
   if(file.size>5*1024*1024)throw Error('Choose a JSON backup smaller than 5 MB.');
   const backup=JSON.parse(await file.text());
   const result=prepareImport(backup,entriesRef.current);
   if(result.added)persist(result.next);
   setRecordMessage(`Imported ${result.added} records. Skipped ${result.duplicates} duplicates and ${result.conflicts} conflicts. Existing records were preserved.`);
  }catch(error){setRecordMessage(error instanceof SyntaxError?'Invalid JSON file. No records were imported.':`Import failed: ${error.message}`);}
 }
 return <><header><strong>◉ ORBIT <small>CREW HEALTH</small></strong><span>LOCAL PROTOTYPE</span></header><main>
 <section className="hero"><p className="eyebrow">YOUR DAILY HEALTH COMPANION</p><h1>A small check-in.<br/>A clearer picture.</h1><p>Record your measurements, reflect on how you feel, and see what changes over time.</p><a className="button" href="#check-in">Start check-in ↗</a></section>
 <aside><strong>Your records stay on this device.</strong><p>Browser storage is unencrypted. Export a backup before clearing browser data. Use synthetic data while testing.</p><p>This prototype does not diagnose conditions, recommend treatment, or provide medical alerts.</p></aside>
 <DailyChecklist entries={entries}/><MetricCards entries={entries}/><div className="workspace"><>{saved?<SavedResults entry={saved} onEdit={edit} onNew={()=>{setSaved(null);resetForm();setMessage('');}}/>:<CheckInForm key={formVersion} entry={editing} disabled={disabled} onSave={save} onCancel={()=>{resetForm();setMessage('Edit cancelled.');}} message={message} setMessage={setMessage}/>}</><div id="trends"><TrendChart entries={entries}/><ChangesPanel entries={entries}/>
 <section className="panel info"><h2>Understand your data</h2><p>Heart rate and blood pressure offer cardiovascular context. Sleep, mood, and stress help you reflect on wellbeing.</p><p>Basic readings cannot measure bone density, radiation exposure, or immune function. These require dedicated assessments.</p><a href="https://www.nasa.gov/hrp/risks/" target="_blank" rel="noopener noreferrer">Explore NASA’s health research ↗</a></section></div></div>
 <RecordHistory entries={entries} disabled={disabled} onEdit={edit} onDelete={remove} onImport={importRecords} message={recordMessage}/>
 </main><footer>Built by 4HARTZ · Early prototype · No medical alert system configured</footer></>;
}
