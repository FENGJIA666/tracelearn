import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';

test('reviewed Ask HTTP outcomes persist and export; cancellation and unavailable model do not save',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'tracelearn-support-api-'));
 const reserve=createServer();await new Promise<void>(resolve=>reserve.listen(0,'127.0.0.1',resolve));const port=(reserve.address() as {port:number}).port;await new Promise<void>(resolve=>reserve.close(()=>resolve()));
 const preload=join(directory,'mock-model.mjs');
 writeFileSync(preload,`const original=globalThis.fetch;globalThis.fetch=async(input,init)=>{
  const url=String(input);if(url.endsWith('/api/embed')){const body=JSON.parse(init.body);return Response.json({embeddings:body.input.map(()=>[1,0])})}
  if(url==='http://127.0.0.1:11434/api/chat'){
   const body=JSON.parse(init.body),data=JSON.parse(body.messages[1].content),review='proposedAnswer' in data;
   if(data.question.includes('unavailable'))return new Response('unavailable',{status:503});
   if(data.question.includes('cancel'))await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,500);init.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('aborted','AbortError'))},{once:true})});
   const missing=data.question.includes('missing'),source=review?data.sources[0]:data.evidence[0];
   const draft={basis:'The source states the rule.',insufficient:missing,missing:missing?'The requested policy is absent.':'',claims:missing?[]:[{text:source.quote,evidenceIds:[source.id]}]};
   const checked={answerabilityReason:missing?'The requested policy is absent.':'The requested source rule is established.',claims:missing?[]:[{index:0,reason:'The claim repeats the complete source rule.',verdict:'supported'}],missing:missing?'The requested policy is absent.':'',sourceCanAnswer:!missing,questionCovered:!missing};
   return Response.json({message:{content:JSON.stringify(review?checked:draft)},total_duration:1000000,prompt_eval_count:1,eval_count:1});
  }return original(input,init);
 };`);
 const child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(preload).href,'server/index.ts'],{env:{...process.env,PORT:String(port),TRACELEARN_DATA:join(directory,'data')},stdio:'pipe'});
 let output='';child.stdout.on('data',data=>output=(output+data).slice(-4000));child.stderr.on('data',data=>output=(output+data).slice(-4000));
 const base=`http://127.0.0.1:${port}`;
 try{
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/identity')).ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,50))}assert.equal(ready,true,output);
  const form=new FormData();form.append('file',new Blob(['The practice room admits at most three visitors at a time.']),'synthetic-room.txt');const course=await(await fetch(base+'/api/import',{method:'POST',body:form})).json();
  const post=(question:string,signal?:AbortSignal)=>fetch(base+'/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:course.id,question}),signal});
  const supported=await(await post('What does the room rule say?')).json();assert.equal(supported.support.outcome,'supported');assert.equal(supported.support.modelCalls,2);assert.equal(supported.sourceHash,course.hash);
  const missing=await(await post('What is the missing policy?')).json();assert.equal(missing.support.outcome,'insufficient');assert.deepEqual(missing.citations,[]);
  const controller=new AbortController();const pending=post('Please cancel this answer.',controller.signal);setTimeout(()=>controller.abort(),100);await assert.rejects(pending,(e:any)=>e.name==='AbortError');await new Promise(resolve=>setTimeout(resolve,600));
  const unavailable=await post('The model is unavailable.');assert.equal(unavailable.status,503);
  const history=await(await fetch(base+`/api/courses/${course.id}/history`)).json();assert.equal(history.chats.length,2);assert.equal(history.chats.some((item:any)=>item.question.includes('cancel')),false);
  const report=await(await fetch(base+`/api/courses/${course.id}/report`)).text();assert.match(report,/#### Claim 1/);assert.match(report,/Support outcome: supported/);assert.match(report,/Support outcome: insufficient/);assert.match(report,/not independent verification/);assert.match(report,new RegExp(course.hash));
 }finally{
  const exited=new Promise<void>(resolve=>child.once('exit',()=>resolve()));if(child.exitCode===null){child.kill();await exited}rmSync(directory,{recursive:true,force:true});
 }
});
