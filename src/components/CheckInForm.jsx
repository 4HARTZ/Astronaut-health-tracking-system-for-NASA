import React, { useRef, useState } from 'react';
import { contexts, definitions, formatDate, localInputTime, ratings, valid } from '../health.js';

const steps = ['Prepare', 'Measurements', 'Wellbeing', 'Review'];
export default function CheckInForm({ entry, disabled, onSave, onCancel, message, setMessage }) {
 const [step,setStep]=useState(0);
 const [review,setReview]=useState(null);
 const formRef=useRef(null),titleRef=useRef(null);
 const editing=Boolean(entry);
 function readRecord(){
  const data=new FormData(formRef.current),timestamp=Date.parse(data.get('time'));
  if(!Number.isFinite(timestamp)||timestamp>Date.now())throw Error('Choose a valid measurement time that is not in the future.');
  const record={id:entry?.id??crypto.randomUUID(),time:new Date(timestamp).toISOString(),context:data.get('context'),notes:data.get('notes').trim()};
  definitions.forEach(([name])=>{record[name]=data.get(name)===''?null:Number(data.get(name));});
  if((record.systolic===null)!==(record.diastolic===null))throw Error('Enter both blood-pressure values, or leave both blank.');
  if(!definitions.some(([name])=>record[name]!==null)&&!record.notes)throw Error('Add at least one measurement, rating, or symptom note.');
  if(!valid(record))throw Error('Check the entered values.');
  return record;
 }
 function move(next){setStep(next);setMessage('');titleRef.current?.focus();}
 function advance(){
  const visible=[...formRef.current.querySelectorAll('input,select,textarea')].filter(el=>!el.closest('[hidden]'));
  for(const el of visible)if(!el.reportValidity())return;
  if(step===0){const time=Date.parse(formRef.current.elements.time.value);if(!Number.isFinite(time)||time>Date.now()){setMessage('Choose a valid measurement time that is not in the future.');return;}}
  if(step===1){const f=formRef.current.elements;if(Boolean(f.systolic.value)!==Boolean(f.diastolic.value)){setMessage('Enter both blood-pressure values, or leave both blank.');return;}}
  if(step===2){try{setReview(readRecord());}catch(error){setMessage(error.message);return;}}
  move(step+1);
 }
 function submit(event){
  event.preventDefault();if(disabled)return;
  if(!editing&&step<3){advance();return;}
  if(editing&&!formRef.current.reportValidity())return;
  try{onSave(readRecord());}catch(error){setMessage(error.message);}
 }
 function fields(names){return <div className="measurement-fields">{definitions.filter(([name])=>names.includes(name)).map(([name,label,unit,min,max,increment])=><label key={name}>{label} · {unit}
  {ratings[name]?<select name={name} defaultValue={entry?.[name]??''}><option value="">Not recorded</option>{ratings[name].map((text,i)=><option key={text} value={i+1}>{i+1} · {text}</option>)}</select>:<input name={name} type="number" min={min} max={max} step={increment} inputMode="decimal" defaultValue={entry?.[name]??''}/>}</label>)}</div>;}
 return <section className="panel" id="check-in"><p className="eyebrow">TAKE A MOMENT</p><h2 ref={titleRef} tabIndex={-1}>{editing?'Edit check-in':'Daily check-in'}</h2>
 {editing?<p className="hint">Editing check-in from {formatDate(entry.time)}.</p>:<><ol className="flow-steps" aria-label="Check-in progress">{steps.map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol><p className="hint">Step {step+1} of 4 · {steps[step]}. Entries are saved only after you review and confirm.</p></>}
 <form ref={formRef} onSubmit={submit} noValidate>
 <div hidden={!editing&&step!==0}><h3>Prepare your check-in</h3><p>Have your approved devices ready. Follow the mission procedure for each measurement and choose the context in which it was taken.</p>
 <label>Measurement time<input autoFocus={editing} name="time" type="datetime-local" step="1" defaultValue={entry?localInputTime(entry.time):localInputTime()} required/></label>
 <label>Context<select name="context" defaultValue={entry?.context??'Resting'}>{contexts.map(c=><option key={c}>{c}</option>)}</select></label></div>
 <div hidden={!editing&&step!==1}><h3>Body measurements</h3><p>Enter available readings with the units shown. Leave anything unmeasured blank. Enter both blood-pressure values together.</p>{fields(['heartRate','systolic','diastolic','temperature'])}<p className="hint">Input limits catch entry errors; they are not medical safety limits.</p></div>
 <div hidden={!editing&&step!==2}><h3>Sleep and wellbeing</h3><p>Reflect on your most recent sleep and how you feel now. Higher quality and mood ratings mean better; higher stress means more stress.</p>{fields(['sleep','quality','mood','stress'])}
 <label>Symptoms or notes<textarea name="notes" maxLength="2000" rows="3" defaultValue={entry?.notes??''}/></label></div>
 {!editing&&step===3&&review&&<section className="review"><h3>Review before saving</h3><p>{formatDate(review.time)} · {review.context}</p><dl>{definitions.map(([name,label,unit])=><div key={name}><dt>{label}</dt><dd>{review[name]===null?'Not recorded':`${review[name]} · ${unit}`}</dd></div>)}</dl><p className="saved-notes">{review.notes||'No symptom notes added.'}</p><p className="hint">Missing values will stay missing. Review the units and values; this is not a clinical assessment.</p></section>}
 <div className="flow-actions">{!editing&&step>0&&<button type="button" onClick={()=>move(step-1)}>Back</button>}<button className="button" disabled={disabled}>{editing?'Update check-in':step===3?'Save check-in ↗':'Continue'}</button>{editing&&<button type="button" onClick={onCancel}>Cancel edit</button>}</div>
 <p role="status" aria-live="polite">{message}</p></form></section>;
}
