import { definitions, observations, sortEntries } from './health.js';

export const insightPolicy = Object.freeze({
 version:'1.0.0',status:'Awaiting medical review',reviewer:null,approvedAt:null,
 clinicalAlertsEnabled:false,sourceCheckedAt:'2026-11-12',
});
export const sources = Object.freeze({
 sleep:{title:'NASA · Isolation and confinement',url:'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/',summary:'NASA identifies sleep loss, circadian disruption, and workload as factors relevant to crew health and performance.'},
 wellbeing:{title:'NASA · Behavioral health risk',url:'https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/',summary:'NASA describes how isolation and confinement can affect behavioral health, sleep, morale, and decision-making.'},
 pressure:{title:'American Heart Association · Home blood pressure monitoring',url:'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home',summary:'The AHA explains the importance of measurement technique and keeping blood-pressure records. This is Earth-based guidance, not a validated spaceflight procedure.'},
});
export const insightRules = Object.freeze([
 {id:'sleep-sequence',title:'Sleep duration pattern',source:'sleep',trigger:'The three most recent sleep readings on distinct local dates in the same context, within seven days, each decrease. One reading per date is used.',limit:'Three readings is a product demonstration rule, not a validated clinical threshold or personal baseline.'},
 {id:'wellbeing-change',title:'Wellbeing ratings changed',source:'wellbeing',trigger:'The latest comparable pair of mood or stress ratings in the last seven days differs. The ratings share a measurement context.',limit:'The app’s 1–5 scales are informal self-reports, not validated screening questionnaires.'},
 {id:'pressure-context',title:'Blood pressure measurement context',source:'pressure',trigger:'A blood-pressure pair is recorded in the latest check-in within seven days.',limit:'No blood-pressure categories, safety ranges, or treatment thresholds are applied. Earth-based measurement advice requires mission-specific review.'},
]);
const localDay=value=>{const d=new Date(value);return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;};
export function buildInsights(entries,now=new Date()){
 const end=new Date(now).getTime(),start=end-7*24*60*60*1000;
 const recent=sortEntries(entries.filter(e=>Date.parse(e.time)>=start&&Date.parse(e.time)<=end));
 const cards=[];
 const rule=id=>insightRules.find(r=>r.id===id);
 // Missingness is a data observation, with no claimed clinical source or health interpretation.
 const latest=recent[0];
 if(latest){
  const missing=definitions.filter(([name])=>latest[name]===null);
  if(missing.length)cards.push({id:'coverage',title:'Latest check-in has missing indicators',text:`Not recorded: ${missing.map(([,label])=>label).join(', ')}.`,evidence:[latest],next:'If a measurement is available under your mission routine, you can add it by editing the check-in. Otherwise leave it unknown.',rule:null,explanation:'Generated when the latest check-in has blank indicator fields. This is an app data-completeness check, not a medical finding.'});
 }
 const sleep=recent.filter(e=>e.sleep!==null);
 const evaluatedContexts=new Set();
 for(const anchor of sleep){
  if(evaluatedContexts.has(anchor.context))continue;
  evaluatedContexts.add(anchor.context);
  const seen=new Set();
  const points=sleep.filter(e=>e.context===anchor.context&&Date.parse(e.time)<=Date.parse(anchor.time)).filter(e=>{const day=localDay(e.time);if(seen.has(day))return false;seen.add(day);return true;}).slice(0,3);
  if(points.length===3&&points[0].sleep<points[1].sleep&&points[1].sleep<points[2].sleep){
   const chronological=[...points].reverse();
   cards.push({id:'sleep-sequence',title:'Recorded sleep duration decreased',text:`${chronological.map(e=>e.sleep).join(' → ')} hours across three recorded dates (${anchor.context}). These are recorded durations, not a determination of inadequate sleep.`,evidence:chronological,next:'Review the dated readings alongside your schedule and optional notes. Keep following your mission’s approved sleep routine.',rule:rule('sleep-sequence')});break;
  }
  // Only evaluate the latest available sequence for each context, not older subsequences.
 }
 for(const change of observations(recent).filter(o=>['mood','stress'].includes(o.name)&&o.delta!==0)){
  cards.push({id:`wellbeing-${change.name}`,title:`Recorded ${change.label.toLowerCase()} changed`,text:`${change.previous[change.name]} → ${change.latest[change.name]} on the app’s 1–5 scale (${change.latest.context}). ${change.name==='stress'?'Higher means more reported stress.':'Higher means a better reported mood.'}`,evidence:[change.previous,change.latest],next:'Review how you felt at each check-in. You may add context in a private note or prepare a report for a qualified reviewer. This does not identify a behavioral health condition.',rule:rule('wellbeing-change')});
 }
 if(latest?.systolic!==null&&latest?.systolic!==undefined&&latest.diastolic!==null){
  cards.push({id:'pressure-context',title:'Keep blood pressure context with the reading',text:`${latest.systolic} / ${latest.diastolic} mmHg was recorded as ${latest.context}. The app does not classify this value as safe or unsafe.`,evidence:[latest],next:'Check the entered units and device reading, and follow the approved mission measurement procedure. AHA guidance is included for background; it is not a substitute for a spaceflight protocol.',rule:rule('pressure-context')});
 }
 return cards;
}
