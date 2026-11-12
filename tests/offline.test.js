import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function worker(){
 const handlers={},deleted=[],items=new Map();let fetches=0,skipped=0;
 const scope='https://example.test/orbit/';
 const cache={addAll:async requests=>{for(const r of requests)items.set(r.url,{cached:r.url});},match:async request=>items.get(typeof request==='string'?request:request.url)};
 const sandbox={URL,Request,self:{registration:{scope},clients:{claim:async()=>{}},skipWaiting:()=>skipped++,addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>cache,keys:async()=>[`orbit-shell:${scope}:old`,'another-app'],delete:async key=>deleted.push(key)},fetch:async()=>{fetches++;throw Error('Offline');}};
 const source=readFileSync('src/service-worker.js','utf8').replace('__VERSION__','test').replace('__FILES__',JSON.stringify(['index.html','assets/main.js','manifest.webmanifest']));
 vm.runInNewContext(source,sandbox);
 return {handlers,items,deleted,fetches:()=>fetches,skipped:()=>skipped};
}
test('worker precaches shell and reopens navigation/assets without network',async()=>{
 const w=worker();let pending;
 w.handlers.install({waitUntil:p=>pending=p});await pending;
 for(const request of [{url:'https://example.test/orbit/',method:'GET',mode:'navigate'},{url:'https://example.test/orbit/assets/main.js',method:'GET',mode:'cors'}]){
  let response;w.handlers.fetch({request,respondWith:p=>response=p});assert.ok(await response);
 }
 assert.equal(w.fetches(),0);
});
test('worker ignores external, unknown and write requests; updates activate only on request',async()=>{
 const w=worker();
 for(const request of [{url:'https://nasa.gov/',method:'GET',mode:'navigate'},{url:'https://example.test/api',method:'POST'},{url:'https://example.test/orbit/private.json',method:'GET'}])w.handlers.fetch({request,respondWith(){assert.fail('Should not cache this request');}});
 assert.equal(w.skipped(),0);w.handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(w.skipped(),1);
 let pending;w.handlers.activate({waitUntil:p=>pending=p});await pending;assert.equal(w.deleted.length,1);assert.match(w.deleted[0],/orbit-shell:/);
});
