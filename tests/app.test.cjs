// Run with node --test tests/app.test.cjs. No dependencies required.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function harness(){
 const nodes=new Map(),stored=new Map();let blocked=false;
 function node(selector){
  if(!nodes.has(selector))nodes.set(selector,{value:selector==='#indicator'?'heartRate':'',innerHTML:'',textContent:'',hidden:false,disabled:false,handlers:{},selectedOptions:[{textContent:'Heart rate · bpm'}],addEventListener(type,fn){this.handlers[type]=fn;},querySelector(){return node('#save');},focus(){},scrollIntoView(){},reset(){for(const el of Object.values(this.elements))el.value='';}});
  return nodes.get(selector);
 }
 const form=node('#form');form.elements={};
 for(const key of ['time','context','notes','heartRate','systolic','diastolic','temperature','sleep','quality','mood','stress'])form.elements[key]={value:'' ,focus(){}};
 const sandbox={document:{querySelector:node},localStorage:{getItem:k=>stored.get(k)||null,setItem(k,v){if(blocked)throw Error('Full');stored.set(k,v);}},console,Date,crypto:{randomUUID:()=>String(Math.random())},FormData:class{constructor(f){this.form=f;}get(k){return this.form.elements[k].value;}},confirm:()=>true};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync('app.js','utf8'),sandbox);
 return {node,form,run:code=>vm.runInContext(code,sandbox),block:()=>blocked=true,submit(){return node('#form').handlers.submit({preventDefault(){}});}};
}
const record=(id='a')=>({id,time:'2026-01-01T12:00:00.000Z',context:'Resting',notes:'Test',heartRate:64,systolic:118,diastolic:76,temperature:36.6,sleep:8,quality:4,mood:4,stress:2});
test('backup merge preserves conflicts and rejects malformed records atomically',()=>{
 const h=harness(),a=record(),b=record('b');
 h.run(`entries=${JSON.stringify([a])}`);
 let r=h.run(`prepareImport(${JSON.stringify({schemaVersion:1,entries:[a,b]})},entries)`);
 assert.equal(r.added,1);assert.equal(r.duplicates,1);
 r=h.run(`prepareImport(${JSON.stringify({schemaVersion:1,entries:[{...a,heartRate:80}]})},entries)`);
 assert.equal(r.conflicts,1);assert.equal(r.next[0].heartRate,64);
 for(const entries of [[{...b,heartRate:'64'}],[{...b,diastolic:null}],[b,b],[{...b,time:'2099-01-01T00:00:00Z'}]])assert.throws(()=>h.run(`prepareImport(${JSON.stringify({schemaVersion:1,entries})},entries)`));
 assert.equal(h.run('entries.length'),1);
});
test('editing replaces a record and storage failure keeps inputs and records',()=>{
 const h=harness();h.run(`entries=${JSON.stringify([record()])};editingId='a'`);
 const fill=()=>{for(const [k,v] of Object.entries(record()))if(h.form.elements[k])h.form.elements[k].value=v===null?'':String(v);};
 fill();h.form.elements.heartRate.value='70';h.submit();assert.equal(h.run('entries.length'),1);assert.equal(h.run('entries[0].heartRate'),70);
 fill();h.form.elements.heartRate.value='75';h.block();h.submit();assert.equal(h.run('entries[0].heartRate'),70);assert.equal(h.form.elements.heartRate.value,'75');
});
test('delete updates saved data and clears active edit',()=>{
 const h=harness();h.run(`entries=${JSON.stringify([record()])};editingId='a'`);
 h.node('#history').handlers.click({target:{closest:()=>({dataset:{id:'a',action:'delete'}})}});
 assert.equal(h.run('entries.length'),0);assert.equal(h.run('editingId'),null);
});
test('changes compare same-context readings; filters include local dates',()=>{
 const h=harness(),a=record('a'),b={...record('b'),time:'2026-01-02T12:00:00Z',heartRate:70},c={...record('c'),time:'2026-01-03T12:00:00Z',context:'After exercise',heartRate:100};
 h.run(`entries=${JSON.stringify([c,b,a])};renderChanges()`);
 assert.match(h.node('#changes').innerHTML,/64 → 70/);assert.doesNotMatch(h.node('#changes').innerHTML,/70 → 100/);
 h.node('#from-date').value='2026-01-02';h.node('#to-date').value='2026-01-02';h.node('#chart-context').value='Resting';assert.equal(h.run('filteredEntries().length'),1);
});
