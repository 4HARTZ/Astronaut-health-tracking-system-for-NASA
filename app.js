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
let entries=[],readable=true;
const ratings={quality:['Very poor','Poor','Fair','Good','Very good'],mood:['Very low','Low','Neutral','Good','Very good'],stress:['Very low','Low','Moderate','High','Very high']};
document.querySelector('#fields').innerHTML=definitions.map(([name,label,unit,min,max,step])=>`<label>${label} · ${unit}${ratings[name]?`<select name="${name}"><option value="">Not recorded</option>${ratings[name].map((text,i)=>`<option value="${i+1}">${i+1} · ${text}</option>`).join('')}</select>`:`<input name="${name}" type="number" min="${min}" max="${max}" step="${step}" inputmode="decimal">`}</label>`).join('');
indicator.innerHTML=definitions.map(([name,label,unit])=>`<option value="${name}">${label} · ${unit}</option>`).join('');
function valid(entry){
 return entry && typeof entry.id==='string' && typeof entry.time==='string' && Number.isFinite(Date.parse(entry.time)) && ['Resting','After exercise','Other'].includes(entry.context) && typeof entry.notes==='string' && entry.notes.length<=2000 && definitions.every(([name,,,min,max,step])=>entry[name]===null || (typeof entry[name]==='number' && Number.isFinite(entry[name]) && entry[name]>=min && entry[name]<=max && Math.abs(entry[name]/step-Math.round(entry[name]/step))<0.00001)) && ((entry.systolic===null)===(entry.diastolic===null));
}
try{
 const raw=localStorage.getItem(key);
 if(raw){const parsed=JSON.parse(raw);if(!Array.isArray(parsed)||!parsed.every(valid))throw Error('Invalid records');entries=parsed.sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));}
}catch{readable=false;message.textContent='Saved records could not be read. Saving is disabled to protect existing data. Check browser storage settings.';form.querySelector('button').disabled=true;}
function resetTime(){const now=new Date();form.elements.time.value=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function chart(){
 const name=indicator.value,points=entries.filter(e=>e[name]!==null).slice(0,7).reverse(),target=document.querySelector('#chart');
 if(points.length<2){target.innerHTML='<p class="empty">Record this indicator in two check-ins to see a trend.</p>';return;}
 const values=points.map(e=>e[name]),low=Math.min(...values)-1,high=Math.max(...values)+1;
 const first=Date.parse(points[0].time),last=Date.parse(points.at(-1).time);
 const coords=points.map((e,i)=>[30+320*(last===first?i/(points.length-1):(Date.parse(e.time)-first)/(last-first)),145-110*(e[name]-low)/(high-low)]);
 target.innerHTML=`<svg viewBox="0 0 380 175" role="img" aria-label="${escapeHtml(indicator.selectedOptions[0].textContent)} trend. Dated values are listed below."><path d="M30 25V145H350" fill="none" stroke="#d2ded3"/><polyline points="${coords.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#527a45" stroke-width="3"/>${coords.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="4" fill="#527a45"/><text x="${x}" y="${y-10}" text-anchor="middle" font-size="11">${values[i]}</text>`).join('')}</svg><details><summary>View dated readings</summary><ul>${points.map(e=>`<li>${escapeHtml(date(e.time))}: ${e[name]}</li>`).join('')}</ul></details>`;
}
function render(){
 const latest=entries[0];document.querySelector('#latest').textContent=latest?date(latest.time):'No readings yet';
 document.querySelector('#metrics').innerHTML=definitions.filter(([name])=>!['diastolic','quality'].includes(name)).map(([name,label,unit])=>{const value=name==='systolic'?(latest?.systolic==null?null:`${latest.systolic} / ${latest.diastolic}`):latest?.[name];return `<article class="metric"><h3>${name==='systolic'?'Blood pressure':label}</h3><strong>${value??'—'}</strong><small>${unit}</small><p>${value==null?'Not recorded':'Recorded · no clinical assessment'}</p></article>`;}).join('');
 document.querySelector('#export').disabled=!entries.length;
 document.querySelector('#history').innerHTML=entries.length?`<table><thead><tr><th>Measured</th>${definitions.map(([,label,unit])=>`<th>${label}<br>${unit}</th>`).join('')}<th>Context & notes</th></tr></thead><tbody>${entries.map(e=>`<tr><td>${escapeHtml(date(e.time))}</td>${definitions.map(([name])=>`<td>${e[name]??'—'}</td>`).join('')}<td>${escapeHtml(e.context)}\n${escapeHtml(e.notes)}</td></tr>`).join('')}</tbody></table>`:'<p class="empty">Your first check-in starts your history. No sample measurements have been added.</p>';
 chart();
}
form.addEventListener('submit',event=>{
 event.preventDefault();if(!readable)return;
 const data=new FormData(form),timestamp=Date.parse(data.get('time'));
 if(!Number.isFinite(timestamp)||timestamp>Date.now()){message.textContent='Choose a valid measurement time that is not in the future.';return;}
 const entry={id:crypto.randomUUID(),time:new Date(timestamp).toISOString(),context:data.get('context'),notes:data.get('notes').trim()};
 definitions.forEach(([name])=>entry[name]=data.get(name)===''?null:Number(data.get(name)));
 if((entry.systolic===null)!==(entry.diastolic===null)){message.textContent='Enter both blood-pressure values, or leave both blank.';return;}
 if(!definitions.some(([name])=>entry[name]!==null)&&!entry.notes){message.textContent='Add at least one measurement, rating, or symptom note.';return;}
 if(!valid(entry)){message.textContent='Check the entered values.';return;}
 const next=[...entries,entry].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
 try{localStorage.setItem(key,JSON.stringify(next));}catch{message.textContent='Could not save: browser storage may be blocked or full. Your form has been kept.';return;}
 entries=next;form.reset();resetTime();render();message.textContent='Check-in saved on this device.';
});
indicator.addEventListener('change',chart);
document.querySelector('#export').addEventListener('click',()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=`orbit-health-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
resetTime();render();
