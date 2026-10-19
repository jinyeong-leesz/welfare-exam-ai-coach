const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('service worker installs complete assets and serves app without network',async()=>{
 const scope='https://example.com/welfare-exam-ai-coach/',events={},buckets=new Map();let online=true,claimed=false;
 function normalize(r){return new URL(typeof r==='string'?r:r.url,scope).href;}
 const caches={keys:async()=>[...buckets.keys()],delete:async k=>buckets.delete(k),open:async k=>{if(!buckets.has(k))buckets.set(k,new Map());const entries=buckets.get(k);return {addAll:async paths=>{for(const p of paths){const name=p==='./'?'index.html':p.slice(2);assert.ok(fs.existsSync(__dirname+'/../'+name));entries.set(normalize(p),new Response(fs.readFileSync(__dirname+'/../'+name)));}},match:async(r,opts)=>{let u=normalize(r);if(opts?.ignoreSearch)u=u.split('?')[0];return entries.get(u)?.clone();}};}};
 const self={location:{origin:'https://example.com'},registration:{scope},clients:{claim:async()=>{claimed=true;}},addEventListener:(n,f)=>events[n]=f};
 const context={self,caches,URL,Response,fetch:async()=>{if(!online)throw Error('offline');return new Response('network');}};
 vm.runInNewContext(fs.readFileSync(__dirname+'/../sw.js','utf8'),context);
 let promise;events.install({waitUntil:p=>promise=p});await promise;
 buckets.set('unrelated-app',new Map());buckets.set('welfare-exam-ai-coach-v1',new Map());events.activate({waitUntil:p=>promise=p});await promise;
 assert.equal(claimed,true);assert.ok(buckets.has('unrelated-app'));assert.ok(!buckets.has('welfare-exam-ai-coach-v1'));
 online=false;
 for(const asset of ['index.html','questions.js','app.js','core.js','styles.css','manifest.webmanifest','icon-192.png','icon-512.png']){let response;events.fetch({request:{method:'GET',url:scope+asset,mode:'cors'},respondWith:p=>response=p});const r=await response;assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>0);}
 let handled=false;events.fetch({request:{method:'GET',url:'https://external.test/api'},respondWith:()=>handled=true});assert.equal(handled,false);
 events.fetch({request:{method:'POST',url:scope+'data'},respondWith:()=>handled=true});assert.equal(handled,false);
 let response;events.fetch({request:{method:'GET',url:scope+'missing.js',mode:'cors'},respondWith:p=>response=p});assert.equal((await response).type,'error');
 events.fetch({request:{method:'GET',url:scope+'route',mode:'navigate'},respondWith:p=>response=p});assert.match(await(await response).text(),/복지시험/);
});
