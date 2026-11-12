import { loadRecords, prepareImport, sortEntries, valid } from '../health.js';

export const LOCAL_WORKSPACE = 'local-only';
const DATABASE = 'orbit-v2';
const request = req => new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
function completion(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error??Error('Storage transaction aborted.'));tx.onerror=()=>{};});}
export function openDatabase(factory=globalThis.indexedDB,name=DATABASE){
 return new Promise((resolve,reject)=>{
  if(!factory){reject(Error('IndexedDB is unavailable.'));return;}
  const req=factory.open(name,1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   const records=db.createObjectStore('records',{keyPath:['workspace','id']});records.createIndex('workspace','workspace');
   const outbox=db.createObjectStore('outbox',{keyPath:['workspace','mutationId']});outbox.createIndex('workspace','workspace');
   db.createObjectStore('metadata',{keyPath:['workspace','key']});
  };
  req.onerror=()=>reject(req.error);
  req.onblocked=()=>reject(Error('Storage upgrade is blocked. Close other Orbit windows and reload.'));
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>db.close();resolve(db);};
 });
}
export function createRepository(db,workspace=LOCAL_WORKSPACE,{uuid=()=>crypto.randomUUID(),notify=()=>{}}={}){
 if(typeof workspace!=='string'||!workspace)throw Error('A workspace is required.');
 async function transaction(stores,mode,work){
  const tx=db.transaction(stores,mode),done=completion(tx);
  try{const result=await work(tx);await done;return result;}
  catch(error){try{tx.abort();}catch{/* already completed */}await done.catch(()=>{});throw error;}
 }
 async function snapshot(){return transaction(['records','outbox'],'readonly',async tx=>{
  const records=await request(tx.objectStore('records').index('workspace').getAll(workspace));
  const pending=await request(tx.objectStore('outbox').index('workspace').count(workspace));
  return {entries:sortEntries(records.filter(r=>!r.deleted).map(r=>r.payload)),revisions:Object.fromEntries(records.filter(r=>!r.deleted).map(r=>[r.id,r.revision])),pending};
 });}
 async function migrateLegacy(storage){
  if(workspace!==LOCAL_WORKSPACE)throw Error('Legacy migration is only allowed into the local-only workspace.');
  // Check before reading legacy data: after migration, the retained source is only a backup.
  const already=await transaction(['metadata'],'readonly',tx=>request(tx.objectStore('metadata').get([workspace,'legacy-v1'])));
  if(already)return;
  const legacy=loadRecords(storage);
  await transaction(['records','metadata'],'readwrite',async tx=>{
   const metadata=tx.objectStore('metadata');
   if(await request(metadata.get([workspace,'legacy-v1'])))return;
   const records=tx.objectStore('records');
   for(const entry of legacy){
    if(await request(records.get([workspace,entry.id])))throw Error('Migration found an existing record ID. Original records are unchanged.');
    records.add({workspace,id:entry.id,payload:entry,revision:1,serverVersion:null,deleted:false});
   }
   // Verify IDs and payloads inside the same transaction before marking success.
   for(const entry of legacy){const copied=await request(records.get([workspace,entry.id]));if(JSON.stringify(copied.payload)!==JSON.stringify(entry))throw Error('Migration verification failed.');}
   metadata.add({workspace,key:'legacy-v1',count:legacy.length,completedAt:new Date().toISOString()});
  });
 }
 function queue(tx,record,operation){
  tx.objectStore('records').put(record);
  tx.objectStore('outbox').add({workspace,mutationId:uuid(),recordId:record.id,operation,payload:record.deleted?null:record.payload,localRevision:record.revision,baseVersion:record.serverVersion,createdAt:new Date().toISOString(),state:'local-only'});
 }
 async function save(entry,expectedRevision=null){
  if(!valid(entry))throw Error('Invalid check-in.');
  await transaction(['records','outbox'],'readwrite',async tx=>{
   const old=await request(tx.objectStore('records').get([workspace,entry.id]));
   if((old?.revision??null)!==expectedRevision||old?.deleted)throw Error('This check-in changed in another window. Refresh and review it before saving.');
   queue(tx,{workspace,id:entry.id,payload:entry,revision:(old?.revision??0)+1,serverVersion:old?.serverVersion??null,deleted:false},'upsert');
  });notify(workspace);
 }
 async function remove(id,expectedRevision){
  await transaction(['records','outbox'],'readwrite',async tx=>{
   const old=await request(tx.objectStore('records').get([workspace,id]));
   if(!old||old.deleted||old.revision!==expectedRevision)throw Error('This check-in changed in another window. Refresh before deleting.');
   queue(tx,{...old,payload:null,deleted:true,revision:old.revision+1},'delete');
  });notify(workspace);
 }
 async function importBackup(backup){
  const result=await transaction(['records','outbox'],'readwrite',async tx=>{
   const records=tx.objectStore('records'),all=await request(records.index('workspace').getAll(workspace));
   const current=all.filter(r=>!r.deleted).map(r=>r.payload),merged=prepareImport(backup,current);
   const existing=new Set(all.map(r=>r.id));let added=0,deletedConflicts=0;
   for(const entry of merged.next){
    if(existing.has(entry.id)){if(all.find(r=>r.id===entry.id)?.deleted)deletedConflicts++;continue;}
    queue(tx,{workspace,id:entry.id,payload:entry,revision:1,serverVersion:null,deleted:false},'upsert');added++;
   }
   return {added,duplicates:merged.duplicates,conflicts:merged.conflicts+deletedConflicts};
  });notify(workspace);return result;
 }
 return {workspace,snapshot,migrateLegacy,save,remove,importBackup};
}
export async function initializeLocalRepository(){
 const db=await openDatabase();
 const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('orbit-storage'):null;
 const repo=createRepository(db,LOCAL_WORKSPACE,{notify:workspace=>channel?.postMessage({workspace})});
 try{await repo.migrateLegacy(window.localStorage);}catch(error){db.close();channel?.close();throw error;}
 return {...repo,subscribe(callback){
  const listener=event=>{if(event.data?.workspace===LOCAL_WORKSPACE)callback();};
  channel?.addEventListener('message',listener);
  const visible=()=>{if(document.visibilityState==='visible')callback();};document.addEventListener('visibilitychange',visible);
  return ()=>{channel?.removeEventListener('message',listener);document.removeEventListener('visibilitychange',visible);};
 },close(){channel?.close();db.close();}};
}
