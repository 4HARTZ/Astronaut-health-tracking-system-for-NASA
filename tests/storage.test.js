import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {createRepository,openDatabase} from '../src/storage/repository.js';
const record=(id='a')=>({id,time:'2026-01-01T12:00:00Z',context:'Resting',notes:'Test',heartRate:64,systolic:118,diastolic:76,temperature:36.6,sleep:8,quality:4,mood:4,stress:2});
const storage=records=>({getItem:()=>JSON.stringify(records)});
const all=(db,store)=>new Promise((resolve,reject)=>{const req=db.transaction(store).objectStore(store).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
test('migration is verified, repeatable, retains legacy source, and does not seed another workspace',async()=>{
 const factory=new IDBFactory(),db=await openDatabase(factory),repo=createRepository(db);
 const legacy=storage([record()]);await repo.migrateLegacy(legacy);await repo.migrateLegacy({getItem(){throw Error('Do not reread backup');}});
 assert.equal((await repo.snapshot()).entries.length,1);assert.equal((await repo.snapshot()).pending,0);assert.equal(JSON.parse(legacy.getItem())[0].id,'a');
 const other=createRepository(db,'account:b');assert.equal((await other.snapshot()).entries.length,0);await assert.rejects(other.migrateLegacy(legacy));db.close();
});
test('failed migration rolls back copies and marker and can retry',async()=>{
 const db=await openDatabase(new IDBFactory()),repo=createRepository(db);
 await repo.save(record('collision'));
 await assert.rejects(repo.migrateLegacy(storage([record('first'),record('collision')])));
 assert.deepEqual((await repo.snapshot()).entries.map(e=>e.id),['collision']);assert.equal((await all(db,'metadata')).length,0);
 await repo.migrateLegacy(storage([record('first')]));assert.equal((await repo.snapshot()).entries.length,2);db.close();
});
test('records and outbox commit atomically, survive reopen, and enforce revisions/workspaces',async()=>{
 const factory=new IDBFactory(),db=await openDatabase(factory);let repo=createRepository(db,'a');
 await repo.save(record());await repo.save({...record(),heartRate:70},1);
 await assert.rejects(repo.save({...record(),heartRate:75},1),/another window/);
 assert.equal((await repo.snapshot()).entries[0].heartRate,70);assert.equal((await repo.snapshot()).pending,2);
 const other=createRepository(db,'b');await other.save(record());await assert.rejects(other.remove('a',2));assert.equal((await other.snapshot()).pending,1);
 await repo.remove('a',2);assert.equal((await repo.snapshot()).entries.length,0);
 const journal=(await all(db,'outbox')).filter(e=>e.workspace==='a');assert.equal(journal.length,3);assert.equal(journal.find(e=>e.operation==='delete').payload,null);
 db.close();const reopened=await openDatabase(factory);repo=createRepository(reopened,'a');assert.equal((await repo.snapshot()).pending,3);assert.equal((await repo.snapshot()).entries.length,0);reopened.close();
});
test('failed outbox write rolls back record and tombstone; concurrent stale saves do not overwrite',async()=>{
 const db=await openDatabase(new IDBFactory());const repo=createRepository(db,'a',{uuid:()=> 'duplicate'});
 await repo.save(record());await assert.rejects(repo.save({...record(),heartRate:70},1));assert.equal((await repo.snapshot()).entries[0].heartRate,64);
 await assert.rejects(repo.remove('a',1));assert.equal((await repo.snapshot()).entries.length,1);assert.equal((await repo.snapshot()).pending,1);
 const working=createRepository(db,'a');const results=await Promise.allSettled([working.save({...record(),heartRate:72},1),working.save({...record(),heartRate:73},1)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);db.close();
});
test('import is atomic, merges current database state and does not resurrect tombstones',async()=>{
 const db=await openDatabase(new IDBFactory()),repo=createRepository(db);await repo.save(record());await repo.remove('a',1);
 const result=await repo.importBackup({schemaVersion:1,entries:[record(),record('b')]});assert.equal(result.added,1);assert.equal(result.conflicts,1);
 const before=await repo.snapshot();await assert.rejects(repo.importBackup({schemaVersion:1,entries:[record('c'),{...record('d'),heartRate:'bad'}]}));assert.deepEqual(await repo.snapshot(),before);db.close();
});
