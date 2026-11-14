import packageInfo from '../package.json';
export const TASK_VERSION='1.0.0';
export const TASK_NAMES={signal:'Signal Watch',position:'Position Match'};
export const LIMITS='Sleep, circadian timing, practice, motivation, stress, vision, motor ability, device/input latency and interruptions can affect results. Changes do not establish a cause or mental state.';
export function positionSequence(count=40,random=Math.random){
 const targets=Array.from({length:count-2},(_,i)=>i<Math.round((count-2)/3));
 for(let i=targets.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[targets[i],targets[j]]=[targets[j],targets[i]];}
 const sequence=[Math.floor(random()*9),Math.floor(random()*9)];
 for(const target of targets){const previous=sequence.at(-2);const choices=Array.from({length:9},(_,i)=>i).filter(i=>i!==previous);sequence.push(target?previous:choices[Math.floor(random()*choices.length)]);}
 return sequence;
}
export function median(values){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;}
export function summarize(session){
 const eligible=session.trials.filter(t=>t.eligible),answered=eligible.filter(t=>t.response!==null),times=answered.filter(t=>t.correct).map(t=>t.rtMs);
 return {eligible:eligible.length,answered:answered.length,correct:answered.filter(t=>t.correct).length,missed:eligible.length-answered.length,incorrectMatches:answered.filter(t=>!t.correct&&t.response==='match').length,incorrectDifferences:answered.filter(t=>!t.correct&&t.response==='different').length,medianMs:median(times),minMs:times.length?Math.min(...times):null,maxMs:times.length?Math.max(...times):null,early:session.earlyResponses.length};
}
const finite=value=>Number.isFinite(value)&&value>=0;
export function validSession(s){
 return Boolean(s&&typeof s.id==='string'&&s.id.length>0&&s.id.length<100&&Object.hasOwn(TASK_NAMES,s.task)&&s.taskVersion===TASK_VERSION&&typeof s.practice==='boolean'&&['running','completed','interrupted'].includes(s.status)&&Number.isFinite(Date.parse(s.startedAt))&&(s.endedAt===null||Number.isFinite(Date.parse(s.endedAt)))&&typeof s.reason==='string'&&s.reason.length<500&&s.context&&typeof s.context.input==='string'&&Array.isArray(s.trials)&&s.trials.length<=1000&&s.trials.every(t=>Number.isInteger(t.index)&&t.index>=0&&typeof t.eligible==='boolean'&&typeof t.correct==='boolean'&&finite(t.onsetMs)&&finite(t.schedulingDelayMs)&&[null,'respond','match','different'].includes(t.response)&&(t.response===null?t.rtMs===null:finite(t.rtMs))&&(s.task==='position'?Number.isInteger(t.stimulus)&&t.stimulus>=0&&t.stimulus<9:t.stimulus==='signal'))&&Array.isArray(s.earlyResponses)&&s.earlyResponses.length<=10000&&s.earlyResponses.every(e=>finite(e.atMs)&&typeof e.input==='string')&&Array.isArray(s.sequence)&&s.sequence.length<=1000&&s.sequence.every(n=>Number.isInteger(n)&&n>=0&&n<9));
}
export function deviceContext(input){return {input,appVersion:packageInfo.version,browser:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,pixelRatio:devicePixelRatio},timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,timing:'Browser performance.now; physical latency uncalibrated'};}
