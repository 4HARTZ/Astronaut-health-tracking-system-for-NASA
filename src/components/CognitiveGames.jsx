import React,{useEffect,useRef,useState} from 'react';
import {TASK_VERSION,TASK_NAMES,LIMITS,positionSequence,summarize,deviceContext} from '../cognitive.js';

const ms=value=>value===null?'—':`${Math.round(value)} ms`;
function Result({session}){
 const s=summarize(session);
 return <><p><strong>{TASK_NAMES[session.task]}</strong> · {session.practice?'Practice · ':''}{session.status==='running'?'incomplete (no saved ending)':session.status} · {new Date(session.startedAt).toLocaleString()} · {session.context.input} · v{session.taskVersion}</p>
 {session.reason&&<p>{session.reason}</p>}
 <p>{session.task==='signal'?`${s.answered}/${s.eligible} signals answered; ${s.missed} unanswered; ${s.early} early responses.`:`${s.correct}/${s.eligible} eligible trials correct; ${s.missed} unanswered; ${s.incorrectMatches} incorrect matches; ${s.incorrectDifferences} incorrect differences.`}</p>
 <p>Median {session.task==='position'?'correct-response ':''}time: {ms(s.medianMs)}. Range: {ms(s.minMs)} to {ms(s.maxMs)}.</p></>;
}
export default function CognitiveGames({repository,onSaved=()=>{}}){
 const [task,setTask]=useState('signal'),[input,setInput]=useState('keyboard'),[stage,setStage]=useState('choose'),[sessions,setSessions]=useState([]),[active,setActive]=useState(null),[visual,setVisual]=useState(null),[message,setMessage]=useState(''),[result,setResult]=useState(null),[practiced,setPracticed]=useState({}),[busy,setBusy]=useState(false);
 const run=useRef(null),frame=useRef(null),writes=useRef(Promise.resolve()),mounted=useRef(true),startButton=useRef(null);
 const [remaining,setRemaining]=useState(0);
 const repositoryRef=useRef(repository);repositoryRef.current=repository;
 const available=Boolean(repository?.cognitiveSessions);
 function persist(session){
  const copy=structuredClone(session);
  writes.current=writes.current.catch(()=>{}).then(()=>repositoryRef.current.saveCognitiveSession(copy));
  writes.current.catch(()=>{if(mounted.current){if(run.current?.session.id===copy.id)finish('Interrupted: local storage failed.');setMessage('Could not save locally. Keep this page open and retry saving the result.');}});
  return writes.current;
 }
 async function refresh(){if(repositoryRef.current?.cognitiveSessions){const all=await repositoryRef.current.cognitiveSessions();if(mounted.current)setSessions(all);}}
 useEffect(()=>{if(stage==='play')startButton.current?.focus();},[stage]);
 useEffect(()=>{mounted.current=true;refresh().catch(()=>setMessage('Could not load cognitive history.'));
  return ()=>{mounted.current=false;if(frame.current!==null)cancelAnimationFrame(frame.current);if(run.current){const s=run.current.session;run.current=null;s.status='interrupted';s.reason='Activity closed before completion.';s.endedAt=new Date().toISOString();persist(s).catch(()=>{});}};
 },[repository]);
 function finish(reason=''){
  const r=run.current;if(!r)return;run.current=null;cancelAnimationFrame(frame.current);
  const s=r.session;s.status=reason?'interrupted':'completed';s.reason=reason;s.endedAt=new Date().toISOString();
  setActive(null);setVisual(null);setStage('result');setResult(structuredClone(s));
  if(s.practice){if(!reason)setPracticed(p=>({...p,[`${s.task}:${s.context.input}`]:true}));setMessage('Practice is excluded from history and trends.');}
  else {setMessage('Saving on this device…');persist(s).then(async()=>{if(mounted.current){setMessage('Saved on this device.');await refresh();onSaved();}}).catch(()=>{});}
 }
 useEffect(()=>{const hidden=()=>{if(document.hidden)finish('Interrupted: page was hidden.');},blur=()=>finish('Interrupted: window lost focus.');
  document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',blur);
  return ()=>{document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',blur);};
 },[]);
 function answer(response,kind){
  const r=run.current;if(!r)return;if(r.session.context.input!==(kind==='keyboard'?'keyboard':'pointer')){setMessage(`This session uses ${r.session.context.input==='keyboard'?'keyboard controls (Space or M/D)':'touch, mouse or pen controls'}. Change controls before starting your next session.`);return;}
  const now=performance.now();
  if(r.session.task==='signal'&&!r.current){r.session.earlyResponses.push({atMs:now-r.start,input:kind});setMessage('Response before the signal. Wait for “Respond”.');return;}
  const t=r.current;if(!t||!t.eligible||t.response!==null)return;
  t.response=response;t.rtMs=now-r.start-t.onsetMs;t.input=kind;t.correct=r.session.task==='signal'||(response==='match')===(t.stimulus===r.session.sequence[t.index-2]);
  if(r.session.practice)setMessage(t.correct?'Response recorded: correct.':'Response recorded: incorrect. Compare with TWO presentations earlier.');
  if(r.session.task==='signal'){r.current=null;setVisual(null);r.next=now+1000+Math.random()*3000;}
  if(!r.session.practice)persist(r.session).catch(()=>{});
 }
 useEffect(()=>{const key=event=>{if(!run.current||event.repeat)return;if(event.key==='Escape'){event.preventDefault();finish('Exited by user.');return;}
  if(event.target instanceof HTMLElement&&event.target.closest('[data-game-exit]'))return;
  const task=run.current.session.task;if(task==='signal'&&event.code==='Space'){event.preventDefault();answer('respond','keyboard');}
  if(task==='position'&&['m','d'].includes(event.key.toLowerCase())){event.preventDefault();answer(event.key.toLowerCase()==='m'?'match':'different','keyboard');}};
  window.addEventListener('keydown',key);return ()=>window.removeEventListener('keydown',key);
 },[]);
 async function start(practice){
  setBusy(true);setMessage('');
  const session={id:crypto.randomUUID(),task,taskVersion:TASK_VERSION,practice,status:'running',startedAt:new Date().toISOString(),endedAt:null,reason:'',context:deviceContext(input),sequence:task==='position'?positionSequence(practice?8:40):[],trials:[],earlyResponses:[]};
  try{if(!practice)await persist(session);}catch{setBusy(false);return;}
  if(!mounted.current)return;
  if(document.hidden){session.status='interrupted';session.reason='Page hidden before activity began.';session.endedAt=new Date().toISOString();if(!practice)await persist(session).catch(()=>{});setBusy(false);refresh();return;}
  const now=performance.now(),r={session,start:now,last:now,next:now+1500,current:null,index:0,duration:practice?20000:180000};
  run.current=r;setActive(session);setStage('play');setVisual(null);setBusy(false);startButton.current?.focus();
  setRemaining(session.task==='signal'?r.duration/1000:Math.ceil((1500+session.sequence.length*3000)/1000));
  function tick(time){
   if(run.current!==r)return;
   setRemaining(Math.max(0,Math.ceil(((session.task==='signal'?r.duration:1500+session.sequence.length*3000)-(time-r.start))/1000)));
   if(time-r.last>1000){finish('Interrupted: browser timing gap exceeded one second.');return;}r.last=time;
   if(session.task==='signal'&&time-r.start>=r.duration){finish();return;}
   if(session.task==='signal'&&r.current&&time-r.start-r.current.onsetMs>=3000){r.current=null;setVisual(null);r.next=time+1000+Math.random()*3000;}
   if((time>=r.next&&!r.current&&time-r.start<=r.duration-3000) || session.task==='position'&&time>=r.next){
    if(session.task==='position'&&r.index>=session.sequence.length){finish();return;}
    const t={index:r.index,stimulus:session.task==='signal'?'signal':session.sequence[r.index],eligible:session.task==='signal'||r.index>=2,onsetMs:time-r.start,schedulingDelayMs:Math.max(0,time-r.next),response:null,rtMs:null,correct:false};
    session.trials.push(t);r.current=t;r.index++;setVisual(t.stimulus);setMessage('');
    r.next=session.task==='signal'?Infinity:time+3000;
    if(!practice)persist(session).catch(()=>{});
   }
   // A neutral gap distinguishes consecutive presentations in the same grid cell.
   if(session.task==='position'&&r.current&&time-r.start-r.current.onsetMs>=2000)setVisual(null);
   frame.current=requestAnimationFrame(tick);
  }
  frame.current=requestAnimationFrame(tick);
 }
 function download(){const blob=new Blob([JSON.stringify({type:'orbit-cognitive-backup',schemaVersion:1,sessions},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='orbit-cognitive-sessions.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const history=sessions.filter(s=>s.task===task&&!s.practice),comparable=history.filter(s=>s.status==='completed'&&s.taskVersion===TASK_VERSION&&s.context.input===input),latest=comparable.slice(0,2);
 return <section className="panel cognitive-panel" aria-labelledby="cognitive-heading"><p className="eyebrow">OPTIONAL ACTIVITIES</p><h2 id="cognitive-heading">Cognitive activities</h2>
 <span className="review-badge">Awaiting medical review</span><p>Original Orbit adaptations, not validated PVT or Cognition instruments. No clinical validation or NASA endorsement. Results cannot independently determine mental state, diagnose conditions or assess fitness for duty.</p>
 <p className="hint">{LIMITS} Results stay separate from health measurements, observations and printed health reports. Storage is local and unencrypted.</p>
 {!available&&<p>Activities are unavailable until device storage is ready.</p>}
 {stage!=='play'&&<><div className="game-options"><label>Activity<select value={task} disabled={busy} onChange={e=>{setTask(e.target.value);setStage('choose');setResult(null);}}><option value="signal">Signal Watch · 3 minutes</option><option value="position">Position Match · about 2 minutes</option></select></label><label>Response controls<select value={input} disabled={busy} onChange={e=>setInput(e.target.value)}><option value="keyboard">Keyboard</option><option value="pointer">Touch / mouse / pen</option></select></label></div>
 <p>{task==='signal'?'Wait for “Respond”, then respond once using Space or the large button. Delays vary. Responses before the signal are recorded. Signals expire after three seconds; that is a game rule, not a medical threshold.':'Watch the grid. Choose Match (M) if the position is the same as TWO presentations earlier; otherwise choose Different (D). The first two presentations are unscored. Each trial lasts three seconds, including a one-second neutral gap. Example: top-left, center, top-left → Match.'}</p>
 <p className="hint">Practice has no saved score. Choose a comfortable input and repeat practice whenever needed. These visual timed activities may not suit every vision, motor or assistive-technology need; no equivalent nonvisual assessment is claimed. No moving animation or color-only cues.</p>
 <div className="flow-actions"><button disabled={!available||busy} onClick={()=>start(true)}>Practice {TASK_NAMES[task]}</button><button disabled={!available||busy||!practiced[`${task}:${input}`]} onClick={()=>start(false)}>Start {TASK_NAMES[task]}</button></div><p className="hint">Complete practice with your selected controls to enable Start. Exit at any time; changing tabs or windows interrupts a session.</p></>}
 {stage==='play'&&<div className="game-play"><h3>{active.practice?'Practice: ':''}{TASK_NAMES[active.task]}</h3><p>{remaining} seconds remaining</p><p>{active.context.input==='keyboard'?(active.task==='signal'?'Space to respond':'M = Match · D = Different'):'Use the response buttons below.'} · Escape to exit</p>
 {active.task==='signal'?<><div className="signal-display">{visual?'Respond':'Wait for the signal'}</div><button ref={startButton} className="game-response" onPointerDown={e=>{e.preventDefault();answer('respond',e.pointerType||'pointer');}} onClick={e=>{if(e.detail===0)answer('respond','keyboard');}}>Respond{active.context.input==='keyboard'?' (Space)':''}</button></>:<><div className="position-grid" aria-label="Visual position task; three rows and three columns">{Array.from({length:9},(_,i)=><div key={i} className={visual===i?'position-active':''}>{visual===i?'●':''}</div>)}</div><p>{run.current?.index<=2?'Observe: first two presentations are unscored.': 'Compare with two presentations earlier.'}</p><div className="flow-actions"><button ref={startButton} className="game-response" onPointerDown={e=>{e.preventDefault();answer('match',e.pointerType||'pointer');}} onClick={e=>{if(e.detail===0)answer('match','keyboard');}}>Match (M)</button><button className="game-response" onPointerDown={e=>{e.preventDefault();answer('different',e.pointerType||'pointer');}} onClick={e=>{if(e.detail===0)answer('different','keyboard');}}>Different (D)</button></div></>}
 <button data-game-exit="true" className="game-exit" onClick={()=>finish('Exited by user.')}>Exit activity</button></div>}
 <p role="status">{message}</p>
 {stage==='result'&&result&&<div className="game-result"><h3>Session results</h3><Result session={result}/>{!result.practice&&<button disabled={busy} onClick={async()=>{setBusy(true);try{await persist(result);setMessage('Saved on this device.');await refresh();onSaved();}catch{/* persist displays error */}finally{setBusy(false);}}}>Retry saving result</button>}</div>}
 {stage!=='play'&&<details><summary>Local performance history and trends</summary><p>Comparisons use completed v{TASK_VERSION} sessions with the selected activity and input only. Practice and incomplete attempts are excluded. Device or browser changes can still affect comparisons. No population norms or clinical baseline are applied.</p>
 {latest.length===2?<p>Latest comparable sessions: median correct-response time {ms(summarize(latest[1]).medianMs)} → {ms(summarize(latest[0]).medianMs)}; correct responses {summarize(latest[1]).correct}/{summarize(latest[1]).eligible} → {summarize(latest[0]).correct}/{summarize(latest[0]).eligible}. These differences do not establish improvement or decline in health.</p>:<p>Two completed sessions with these settings are needed for a descriptive comparison.</p>}
 <button disabled={!sessions.length} onClick={download}>Export cognitive backup</button><label>Import cognitive backup<input type="file" accept="application/json,.json" disabled={!available||busy} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);try{if(file.size>5*1024*1024)throw Error('Choose a backup smaller than 5 MB.');const count=await repository.importCognitiveBackup(JSON.parse(await file.text()));await refresh();onSaved();setMessage(`Imported ${count} cognitive sessions; existing sessions preserved.`);}catch(error){setMessage(`Import failed: ${error.message}`);}finally{setBusy(false);}}}/></label><p className="hint">Separate from measurement backups. Includes trial data and browser context. Running attempts from another tab or a closed page are unfinished, not completed; they are excluded from trends. Showing the latest 30 attempts for this activity; export includes all activities and attempts.</p>
 <div className="game-history">{history.length?history.slice(0,30).map(s=><article key={s.id}><Result session={s}/></article>):<p>No saved sessions for this activity.</p>}</div></details>}
 <details><summary>Sources and adaptation limits</summary><p><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/">Brief PVT research</a> supports investigating short vigilance tasks, not validation of Orbit. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4691281/">Cognition research</a> includes a fractal 2-back; Orbit uses positions and two response choices. <a href="https://pubmed.ncbi.nlm.nih.gov/17470009/">N-back validity research</a> cautions against treating performance as general working-memory capacity. Original code, instructions and stimuli; no assessment assets copied.</p></details>
 </section>;
}
