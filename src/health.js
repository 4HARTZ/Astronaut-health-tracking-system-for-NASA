export const definitions = [
 ['heartRate','Resting heart rate','bpm',1,350,1],
 ['systolic','Systolic pressure','mmHg',1,350,1],
 ['diastolic','Diastolic pressure','mmHg',1,250,1],
 ['temperature','Body temperature','°C',25,45,0.1],
 ['sleep','Sleep duration','hours',0,24,0.1],
 ['quality','Sleep quality','1–5 · higher is better',1,5,1],
 ['mood','Mood','1–5 · higher is better',1,5,1],
 ['stress','Stress','1–5 · higher is more stress',1,5,1]
];

export const STORAGE_KEY = "orbit-health-v1";
export const contexts = ["Resting", "After exercise", "Other"];
export const ratings={quality:['Very poor','Poor','Fair','Good','Very good'],mood:['Very low','Low','Neutral','Good','Very good'],stress:['Very low','Low','Moderate','High','Very high']};
export function valid(entry){
 return entry && typeof entry.id==='string' && entry.id.length>0 && entry.id.length<=100 && typeof entry.time==='string' && Number.isFinite(Date.parse(entry.time)) && Date.parse(entry.time)<=Date.now() && ['Resting','After exercise','Other'].includes(entry.context) && typeof entry.notes==='string' && entry.notes.length<=2000 && definitions.every(([name,,,min,max,step])=>entry[name]===null || (typeof entry[name]==='number' && Number.isFinite(entry[name]) && entry[name]>=min && entry[name]<=max && Math.abs(entry[name]/step-Math.round(entry[name]/step))<0.00001)) && ((entry.systolic===null)===(entry.diastolic===null));
}

export function prepareImport(backup,current){
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

export const sortEntries = entries => [...entries].sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
export const formatDate = value => new Date(value).toLocaleString([], {dateStyle:'medium',timeStyle:'short'});
export function localInputTime(value = new Date()) {
 const d = new Date(value);
 return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19);
}
export function loadRecords(storage) {
 const raw=storage.getItem(STORAGE_KEY);
 if(!raw)return [];
 const parsed=JSON.parse(raw);
 if(!Array.isArray(parsed)||!parsed.every(valid)||new Set(parsed.map(e=>e.id)).size!==parsed.length)throw Error('Invalid saved records');
 return sortEntries(parsed);
}
export function saveRecords(storage,entries) {
 storage.setItem(STORAGE_KEY,JSON.stringify(entries));
 return entries;
}
export function filterEntries(entries,{from='',to='',context=''}={}) {
 if(from&&to&&from>to)return [];
 return entries.filter(e=>{
  const d=new Date(e.time),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  return (!from||day>=from)&&(!to||day<=to)&&(!context||e.context===context);
 });
}
export function observations(entries) {
 return definitions.flatMap(([name,label,unit])=>{
  const available=sortEntries(entries).filter(e=>e[name]!==null);
  const latest=available.find(candidate=>available.some(e=>e.context===candidate.context&&Date.parse(e.time)<Date.parse(candidate.time)));
  if(!latest)return [];
  const previous=available.find(e=>e.context===latest.context&&Date.parse(e.time)<Date.parse(latest.time));
  return [{name,label,unit,latest,previous,delta:Number((latest[name]-previous[name]).toFixed(2))}];
 });
}
