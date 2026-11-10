'use strict';
const definitions = [
 ['heartRate','Resting heart rate','bpm',1,350,1],
 ['systolic','Systolic pressure','mmHg',1,350,1],
 ['diastolic','Diastolic pressure','mmHg',1,250,1],
 ['temperature','Body temperature','°C',25,45,0.1],
 ['sleep','Sleep duration','hours',0,24,0.1],
 ['quality','Sleep quality','1–5 · higher is better',1,5,1],
 ['mood','Mood','1–5 · higher is better',1,5,1],
 ['stress','Stress','1–5 · higher is more stress',1,5,1]
];
const form=document.querySelector('#form'), message=document.querySelector('#message'), indicator=document.querySelector('#indicator');
const key='orbit-health-v1';
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const date=value=>new Date(value).toLocaleString([],{dateStyle:'medium',timeStyle:'short'});
let entries=[],readable=true,editingId=null;
const ratings={quality:['Very poor','Poor','Fair','Good','Very good'],mood:['Very low','Low','Neutral','Good','Very good'],stress:['Very low','Low','Moderate','High','Very high']};
document.querySelector('#fields').innerHTML=definitions.map(([name,label,unit,min,max,step])=>`<label>${label} · ${unit}${ratings[name]?`<select name="${name}"><option value="">Not recorded</option>${ratings[name].map((text,i)=>`<option value="${i+1}">${i+1} · ${text}</option>`).join('')}</select>`:`<input name="${name}" type="number" min="${min}" max="${max}" step="${step}" inputmode="decimal">`}</label>`).join('');
indicator.innerHTML=definitions.map(([name,label,unit])=>`<option value="${name}">${label} · ${unit}</option>`).join('');
function valid(entry){
 return entry && typeof entry.id==='string' && entry.id.length>0 && entry.id.length<=100 && typeof entry.time==='string' && Number.isFinite(Date.parse(entry.time)) && Date.parse(entry.time)<=Date.now() && ['Resting','After exercise','Other'].includes(entry.context) && typeof entry.notes==='string' && entry.notes.length<=2000 && definitions.every(([name,,,min,max,step])=>entry[name]===null || (typeof entry[name]==='number' && Number.isFinite(entry[name]) && entry[name]>=min && entry[name]<=max && Math.abs(entry[name]/step-Math.round(entry[name]/step))<0.00001)) && ((entry.systolic===null)===(entry.diastolic===null));
}
try{
 const raw=localStorage.getItem(key);
 if(raw){const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.every(valid)||new Set(parsed.map(e=>e.id)).size!==parsed.length)throw Error('Invalid records');entries=parsed.sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));}
}catch{readable=false;message.textContent='Saved records could not be read. Saving is disabled to protect existing data. Check browser storage settings.';form.querySelector('button').disabled=true;}
function resetTime(){const now=new Date();form.elements.time.value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function chart(){
 const name=indicator.value,points=filteredEntries().filter(e=>e[name]!==null).slice(0,100).reverse(),target=document.querySelector('#chart');
 if(points.length<2){target.innerHTML='<p class="empty">At least two readings in this date range and context are needed for a trend.</p>';return;}
 const values=points.map(e=>e[name]),low=Math.min(...values)-1,high=Math.max(...values)+1;
 const first=Date.parse(points[0].time),last=Date.parse(points.at(-1).time);
 const coords=points.map((e,i)=>[30+320*(last===first?i/(points.length-1):(Date.parse(e.time)-first)/(last-first)),145-110*(e[name]-low)/(high-low)]);
 target.innerHTML=`<svg viewBox="0 0 380 175" role="img" aria-label="${escapeHtml(indicator.selectedOptions[0].textContent)} trend. Dated values are listed below."><path d="M30 25V145H350" fill="none" stroke="#d2ded3"/><polyline points="${coords.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#527a45" stroke-width="3"/>${coords.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="4" fill="#527a45"/><text x="${x}" y="${y-10}" text-anchor="middle" font-size="11">${points.length<=10?values[i]:''}</text>`).join('')}</svg><details><summary>View dated readings</summary><ul>${points.map(e=>`<li>${escapeHtml(date(e.time))}: ${e[name]} · ${escapeHtml(e.context)}</li>`).join('')}</ul></details>`;
}
function render(){
 const latest=entries[0];document.querySelector('#latest').textContent=latest?date(latest.time):'No readings yet';
 document.querySelector('#metrics').innerHTML=definitions.filter(([name])=>!['diastolic','quality'].includes(name)).map(([name,label,unit])=>{const value=name==='systolic'?(latest?.systolic==null?null:`${latest.systolic} / ${latest.diastolic}`):latest?.[name];return `<article class="metric"><h3>${name==='systolic'?'Blood pressure':label}</h3><strong>${value??'—'}</strong><small>${unit}</small><p>${value==null?'Not recorded':'Recorded · no clinical assessment'}</p></article>`;}).join('');
 document.querySelector('#export').disabled=!entries.length;
 document.querySelector('#history').innerHTML=entries.length?`<table><thead><tr><th>Measured</th>${definitions.map(([,label,unit])=>`<th>${label}<br>${unit}</th>`).join('')}<th>Context & notes</th><th>Actions</th></tr></thead><tbody>${entries.map(e=>`<tr><td>${escapeHtml(date(e.time))}</td>${definitions.map(([name])=>`<td>${e[name]??'—'}</td>`).join('')}<td>${escapeHtml(e.context)}\n${escapeHtml(e.notes)}</td><td><button type="button" data-action="edit" data-id="${escapeHtml(e.id)}" ${readable?'':'disabled'}>Edit</button> <button type="button" data-action="delete" data-id="${escapeHtml(e.id)}" ${readable?'':'disabled'}>Delete</button></td></tr>`).join('')}</tbody></table>`:'<p class="empty">Your first check-in starts your history. No sample measurements have been added.</p>';
 chart();
 renderChanges();
}
form.addEventListener('submit',event=>{
 event.preventDefault();if(!readable)return;
 const data=new FormData(form),timestamp=Date.parse(data.get('time'));
 if(!Number.isFinite(timestamp)||timestamp>Date.now()){message.textContent='Choose a valid measurement time that is not in the future.';return;}
 const entry={id:editingId || crypto.randomUUID(),time:new Date(timestamp).toISOString(),context:data.get('context'),notes:data.get('notes').trim()};
 definitions.forEach(([name])=>entry[name]=data.get(name)===''?null:Number(data.get(name)));
 if((entry.systolic===null)!==(entry.diastolic===null)){message.textContent='Enter both blood-pressure values, or leave both blank.';return;}
 if(!definitions.some(([name])=>entry[name]!==null)&&!entry.notes){message.textContent='Add at least one measurement, rating, or symptom note.';return;}
 if(!valid(entry)){message.textContent='Check the entered values.';return;}
 const next=[...entries.filter(e=>e.id!==editingId),entry].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
 try{localStorage.setItem(key,JSON.stringify(next));}catch{message.textContent='Could not save: browser storage may be blocked or full. Your form has been kept.';return;}
 const wasEditing=editingId!==null; entries=next;cancelEdit();render();message.textContent=wasEditing?'Check-in updated on this device.':'Check-in saved on this device.';
});
indicator.addEventListener('change',chart);
document.querySelector('#export').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=`orbit-health-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
resetTime();render();

function filteredEntries(){
 const from=document.querySelector('#from-date').value,to=document.querySelector('#to-date').value,context=document.querySelector('#chart-context').value;
 if(from && to && from>to)return [];
 return entries.filter(e=>{
  const d=new Date(e.time),localDay=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return (!from||localDay>=from)&&(!to||localDay<=to)&&(!context||e.context===context);
 });
}
function renderChanges(){
 const observations=[];
 for(const [name,label,unit] of definitions){
  const available=entries.filter(e=>e[name]!==null);
  const latest=available.find(candidate=>available.some(e=>e.id!==candidate.id&&e.context===candidate.context&&Date.parse(e.time)<Date.parse(candidate.time)));if(!latest)continue;
  const previous=available.find(e=>e.id!==latest.id&&e.context===latest.context&&Date.parse(e.time)<Date.parse(latest.time));
  if(!previous)continue;
  const delta=Number((latest[name]-previous[name]).toFixed(2));
  observations.push(`<li><strong>${label}:</strong> ${previous[name]} → ${latest[name]} (${delta===0?'unchanged':`${delta>0?'+':''}${delta}`}) · ${unit}<br><span class="hint">${escapeHtml(date(previous.time))} → ${escapeHtml(date(latest.time))} · ${escapeHtml(latest.context)}</span></li>`);
 }
 document.querySelector('#changes').innerHTML=observations.length?`<ul class="observations">${observations.join('')}</ul>`:'<p class="empty">Add two readings at different times in the same context to see changes.</p>';
}
function cancelEdit(){
 editingId=null;form.reset();resetTime();
 document.querySelector('#save').textContent='Save check-in ↗';
 document.querySelector('#cancel-edit').hidden=true;
}
function persist(next){
 if(!readable)throw Error('Storage is unavailable. Existing records were not changed.');
 localStorage.setItem(key,JSON.stringify(next));entries=next;
}
document.querySelector('#cancel-edit').addEventListener('click',()=>{cancelEdit();message.textContent='Edit cancelled.';});
document.querySelector('#history').addEventListener('click',event=>{
 const button=event.target.closest('button[data-action]');if(!button||!readable)return;
 const entry=entries.find(e=>e.id===button.dataset.id);if(!entry)return;
 if(button.dataset.action==='edit'){
  editingId=entry.id;
  for(const [name] of definitions)form.elements[name].value=entry[name]??'';
  form.elements.context.value=entry.context;form.elements.notes.value=entry.notes;
  const d=new Date(entry.time);form.elements.time.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  document.querySelector('#save').textContent='Update check-in';document.querySelector('#cancel-edit').hidden=false;
  message.textContent=`Editing check-in from ${date(entry.time)}.`;
  form.elements.time.focus();document.querySelector('#check-in').scrollIntoView({behavior:'smooth'});
 }else if(confirm(`Delete the check-in from ${date(entry.time)}? This cannot be undone. Export a backup first if needed.`)){
  try{persist(entries.filter(e=>e.id!==entry.id));if(editingId===entry.id)cancelEdit();render();document.querySelector('#record-message').textContent='Check-in deleted.';}
  catch{document.querySelector('#record-message').textContent='Could not delete: browser storage is unavailable. Records were not changed.';}
 }
});
for(const id of ['from-date','to-date','chart-context'])document.querySelector(`#${id}`).addEventListener('change',chart);
document.querySelector('#reset-filters').addEventListener('click',()=>{
 for(const id of ['from-date','to-date','chart-context'])document.querySelector(`#${id}`).value='';chart();
});
function prepareImport(backup,current){
 if(!backup||backup.schemaVersion!==1||!Array.isArray(backup.entries)||backup.entries.length>10000||!backup.entries.every(valid))throw Error('Invalid backup. Expected an Orbit version 1 JSON export with valid, non-future readings (maximum 10,000 records).');
 if(new Set(backup.entries.map(e=>e.id)).size!==backup.entries.length)throw Error('Backup contains duplicate record IDs. Nothing was imported.');
 const existing=new Map(current.map(e=>[e.id,e]));let duplicates=0,conflicts=0;
 const additions=[];
 for(const entry of backup.entries){
  const old=existing.get(entry.id);
  if(old){
   const fields=['time','context','notes',...definitions.map(([name])=>name)];
   if(fields.every(name=>old[name]===entry[name]))duplicates++;else conflicts++;
  }else{
   const clean={id:entry.id,time:entry.time,context:entry.context,notes:entry.notes};
   for(const [name] of definitions)clean[name]=entry[name];additions.push(clean);
  }
 }
 return {next:[...current,...additions].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time)),added:additions.length,duplicates,conflicts};
}
document.querySelector('#import-button').disabled=!readable;
document.querySelector('#import-button').addEventListener('click',()=>document.querySelector('#import-file').click());
document.querySelector('#import-file').addEventListener('change',async event=>{
 const file=event.target.files[0],status=document.querySelector('#record-message');if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('Choose a JSON backup smaller than 5 MB.');
  const result=prepareImport(JSON.parse(await file.text()),entries);
  if(result.added)persist(result.next);
  render();status.textContent=`Imported ${result.added} records. Skipped ${result.duplicates} duplicates and ${result.conflicts} conflicts. Existing records were preserved.`;
 }catch(error){status.textContent=error instanceof SyntaxError?'Invalid JSON file. No records were imported.':`Import failed: ${error.message}`;}
 finally{event.target.value='';}
});
