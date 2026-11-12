import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildInsights,insightPolicy,insightRules,sources} from '../src/insights.js';
const now=new Date('2026-11-12T18:00:00Z');
const record=(id,time,extra={})=>({id,time,context:'Resting',notes:'',heartRate:64,systolic:118,diastolic:76,temperature:36.6,sleep:8,quality:4,mood:4,stress:2,...extra});
test('sleep observation uses distinct dates in matching context and never claims clinical approval',()=>{
 const entries=[record('a','2026-11-10T12:00:00Z'),record('b','2026-11-11T12:00:00Z',{sleep:7}),record('c','2026-11-12T12:00:00Z',{sleep:6})];
 const result=buildInsights(entries,now).find(c=>c.id==='sleep-sequence');assert.ok(result);assert.match(result.text,/8 → 7 → 6/);
 assert.equal(insightPolicy.clinicalAlertsEnabled,false);assert.equal(insightPolicy.reviewer,null);assert.equal(insightPolicy.approvedAt,null);
 for(const r of insightRules)assert.ok(sources[r.source].url.startsWith('https://'));
 assert.equal(buildInsights(entries.map(e=>({...e,time:'2026-11-12T12:00:00Z'})),now).some(c=>c.id==='sleep-sequence'),false);
 assert.equal(buildInsights(entries.map((e,i)=>({...e,context:i===1?'Other':'Resting'})),now).some(c=>c.id==='sleep-sequence'),false);
});
test('missingness preserves zero, old/future records are excluded and inputs are not modified',()=>{
 const current=record('a','2026-11-12T12:00:00Z',{sleep:0,temperature:null});const before=JSON.stringify(current);
 const cards=buildInsights([current],now);const missing=cards.find(c=>c.id==='coverage');assert.match(missing.text,/Body temperature/);assert.doesNotMatch(missing.text,/Sleep duration/);assert.equal(JSON.stringify(current),before);
 assert.deepEqual(buildInsights([record('old','2026-01-01T12:00:00Z'),record('future','2026-11-13T12:00:00Z')],now),[]);
});
test('an older falling sequence is not presented when the latest sequence no longer falls',()=>{
 const entries=[record('a','2026-11-09T12:00:00Z',{sleep:9}),record('b','2026-11-10T12:00:00Z',{sleep:8}),record('c','2026-11-11T12:00:00Z',{sleep:7}),record('d','2026-11-12T12:00:00Z',{sleep:8})];
 assert.equal(buildInsights(entries,now).some(c=>c.id==='sleep-sequence'),false);
});
test('wellbeing comparison remains descriptive and requires a comparable pair',()=>{
 const a=record('a','2026-11-11T12:00:00Z'),b=record('b','2026-11-12T12:00:00Z',{mood:3,stress:4});
 assert.equal(buildInsights([b,a],now).filter(c=>c.id.startsWith('wellbeing-')).length,2);
 assert.equal(buildInsights([b,{...a,context:'Other'}],now).filter(c=>c.id.startsWith('wellbeing-')).length,0);
});
