import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, loadRecords, saveRecords, prepareImport, filterEntries, observations } from '../src/health.js';
export const record=(id='a')=>({id,time:'2026-01-01T12:00:00.000Z',context:'Resting',notes:'Test',heartRate:64,systolic:118,diastolic:76,temperature:36.6,sleep:8,quality:4,mood:4,stress:2});
test('existing version 1 browser records load without migration or data loss',()=>{
 const a=record(),storage={getItem:key=>{assert.equal(key,STORAGE_KEY);return JSON.stringify([a]);}};
 assert.deepEqual(loadRecords(storage),[a]);
 assert.throws(()=>loadRecords({getItem:()=>'{broken'}));
 assert.throws(()=>loadRecords({getItem:()=>JSON.stringify([a,a])}));
 assert.throws(()=>saveRecords({setItem(){throw Error('Full');}},[a]),/Full/);
});
test('backup merge preserves conflicts and rejects malformed records atomically',()=>{
 const a=record(),b=record('b'),current=[a];
 const result=prepareImport({schemaVersion:1,entries:[a,b]},current);
 assert.equal(result.added,1);assert.equal(result.duplicates,1);assert.deepEqual(current,[a]);
 const conflict=prepareImport({schemaVersion:1,entries:[{...a,heartRate:80}]},current);
 assert.equal(conflict.conflicts,1);assert.equal(conflict.next[0].heartRate,64);
 for(const entries of [[{...b,heartRate:'64'}],[{...b,diastolic:null}],[b,b],[{...b,time:'2099-01-01T00:00:00Z'}]])assert.throws(()=>prepareImport({schemaVersion:1,entries},current));
});
test('observations compare same contexts and date filters include local dates',()=>{
 const a=record(),b={...record('b'),time:'2026-01-02T12:00:00Z',heartRate:70},c={...record('c'),time:'2026-01-03T12:00:00Z',context:'After exercise',heartRate:100};
 const result=observations([c,b,a]).find(e=>e.name==='heartRate');
 assert.equal(result.delta,6);assert.equal(result.latest.id,'b');assert.equal(result.previous.id,'a');
 const local=new Date(b.time);const day=`${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}-${String(local.getDate()).padStart(2,'0')}`;
 assert.deepEqual(filterEntries([c,b,a],{from:day,to:day,context:'Resting'}),[b]);
 assert.deepEqual(filterEntries([a],{from:'2026-02-01',to:'2026-01-01'}),[]);
});
