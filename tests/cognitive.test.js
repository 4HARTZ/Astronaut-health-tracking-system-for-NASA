import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {positionSequence,summarize,validSession} from '../src/cognitive.js';
import {openDatabase,createRepository} from '../src/storage/repository.js';
const session=(id='s')=>({id,task:'signal',taskVersion:'1.0.0',practice:false,status:'running',startedAt:'2026-11-13T00:00:00Z',endedAt:null,reason:'',context:{input:'keyboard'},sequence:[],trials:[],earlyResponses:[]});
test('position generation controls target count and excludes accidental non-target matches',()=>{
 for(let i=0;i<30;i++){const seq=positionSequence();assert.equal(seq.length,40);assert.ok(seq.every(n=>Number.isInteger(n)&&n>=0&&n<9));assert.equal(seq.filter((n,j)=>j>=2&&n===seq[j-2]).length,13);}
});
test('summary keeps missing responses out of timing and warmups out of accuracy',()=>{
 const s={...session(),task:'position',trials:[{eligible:false,response:null,rtMs:null,correct:false},{eligible:true,response:'match',rtMs:500,correct:true},{eligible:true,response:'different',rtMs:200,correct:false},{eligible:true,response:null,rtMs:null,correct:false},{eligible:true,response:'match',rtMs:700,correct:true}]};
 assert.deepEqual(summarize(s),{eligible:4,answered:3,correct:2,missed:1,incorrectMatches:0,incorrectDifferences:1,medianMs:600,minMs:500,maxMs:700,early:0});assert.equal(summarize(session()).medianMs,null);
});
test('cognitive storage is isolated, journaled atomically and final sessions cannot be overwritten',async()=>{
 const factory=new IDBFactory(),db=await openDatabase(factory),repo=createRepository(db,'a');
 await repo.saveCognitiveSession(session());assert.equal((await repo.snapshot()).entries.length,0);assert.equal((await repo.snapshot()).pending,1);assert.equal((await createRepository(db,'b').cognitiveSessions()).length,0);
 const final={...session(),status:'interrupted',endedAt:'2026-11-13T00:01:00Z',reason:'Exited by user.'};await repo.saveCognitiveSession(final);await repo.saveCognitiveSession(final);await assert.rejects(repo.saveCognitiveSession(session()));
 db.close();const reopened=await openDatabase(factory),restored=createRepository(reopened,'a');assert.deepEqual(await restored.cognitiveSessions(),[final]);reopened.close();
});
test('backup roundtrip preserves existing IDs and invalid imports roll back completely',async()=>{
 const db=await openDatabase(new IDBFactory()),repo=createRepository(db),backup={type:'orbit-cognitive-backup',schemaVersion:1,sessions:[session()]};
 assert.equal(await repo.importCognitiveBackup(backup),1);assert.equal(await repo.importCognitiveBackup(backup),0);
 await assert.rejects(repo.importCognitiveBackup({...backup,sessions:[session('new'),{...session('bad'),trials:[{rtMs:NaN}]}]}));assert.equal((await repo.cognitiveSessions()).length,1);
 assert.equal(validSession({...session(),task:'unknown'}),false);
 const failing=createRepository(db,'other',{uuid:()=> 'duplicate'});await failing.saveCognitiveSession(session());await assert.rejects(failing.saveCognitiveSession(session('second')));assert.equal((await failing.cognitiveSessions()).length,1);db.close();
});
test('version 1 database upgrade preserves health stores and adds cognitive sessions',async()=>{
 const factory=new IDBFactory();await new Promise((resolve,reject)=>{const req=factory.open('upgrade',1);req.onupgradeneeded=()=>{const db=req.result;for(const [name,key] of [['records','id'],['outbox','mutationId']]){const store=db.createObjectStore(name,{keyPath:['workspace',key]});store.createIndex('workspace','workspace');}db.createObjectStore('metadata',{keyPath:['workspace','key']});req.transaction.objectStore('metadata').put({workspace:'local-only',key:'legacy-v1',count:0});};req.onsuccess=()=>{req.result.close();resolve();};req.onerror=()=>reject(req.error);});
 const db=await openDatabase(factory,'upgrade'),repo=createRepository(db);await repo.migrateLegacy({getItem(){throw Error('Existing marker must survive');}});await repo.saveCognitiveSession(session());assert.equal((await repo.cognitiveSessions()).length,1);db.close();
});
