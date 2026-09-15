import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';

test('practice HTTP route preserves late-passage provenance and rejects concurrent duplicate completion',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'tracelearn-practice-api-'));
  const reserve=createServer();await new Promise<void>(resolve=>reserve.listen(0,'127.0.0.1',resolve));
  const port=(reserve.address() as {port:number}).port;await new Promise<void>(resolve=>reserve.close(()=>resolve()));
  const preload=join(directory,'mock-model.mjs');
  writeFileSync(preload,`const original=globalThis.fetch;globalThis.fetch=async(input,init)=>{if(String(input)==='http://127.0.0.1:11434/api/chat'){await new Promise(resolve=>setTimeout(resolve,100));return new Response(JSON.stringify({message:{content:JSON.stringify({distractors:['Distractor alpha','Distractor beta','Distractor gamma']})},total_duration:1000000,prompt_eval_count:1,eval_count:1}));}return original(input,init);};`);
  const child=spawn(process.execPath,['--import','tsx','--import',pathToFileURL(preload).href,'server/index.ts'],{env:{...process.env,PORT:String(port),TRACELEARN_DATA:join(directory,'data')},stdio:'pipe'});
  let output='';child.stdout.on('data',data=>{output=(output+data).slice(-4000);});child.stderr.on('data',data=>{output=(output+data).slice(-4000);});
  const base=`http://127.0.0.1:${port}`;
  const post=(body:unknown)=>fetch(base+'/api/generate-question',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(base+'/api/identity');if(r.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,50));}
    assert.equal(ready,true,output);
    const identity=await(await fetch(base+'/api/identity')).json();assert.equal(identity.app,'tracelearn');assert.match(identity.installation,/^[a-f0-9]{64}$/);assert.match(identity.build,/^[a-f0-9]{64}$/);
    const form=new FormData();
    // Early content cannot form a valid 35–300 character exercise; useful material is after five passages.
    const prefix=('Short. '.repeat(1500))+'\n';
    const late='The late source passage establishes that every candidate key is minimal.';
    form.append('file',new Blob([prefix+late]),'original-late-source.txt');
    const imported=await(await fetch(base+'/api/import',{method:'POST',body:form})).json();
    const section=imported.sections.find((item:any)=>item.text.includes(late));assert.ok(section);assert.ok(imported.sections.indexOf(section)>5);
    let response=await post({courseId:imported.id,sectionId:'invented'});assert.equal(response.status,400);
    const concurrent=await Promise.all([post({courseId:imported.id,sectionId:section.id}),post({courseId:imported.id,sectionId:section.id})]);
    assert.deepEqual(concurrent.map(response=>response.status).sort(),[200,409]);
    const created=await concurrent.find(response=>response.status===200)!.json();assert.equal('correct' in created,false);assert.equal('quote' in created,false);
    const stored=await(await fetch(base+`/api/courses/${imported.id}/questions`)).json();assert.equal(stored.length,1);
    const attempt=await(await fetch(base+'/api/attempt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:created.id,chosen:0,confidence:'somewhat'})})).json();
    assert.equal(attempt.sourceHash,imported.hash);assert.deepEqual(attempt.sourceIds,[section.id]);assert.equal(attempt.prompt.split('\n\n')[1].replace('_____',attempt.options[attempt.correct]),late);
    response=await post({courseId:imported.id,sectionId:section.id});assert.equal(response.status,409);assert.match((await response.json()).error,/already has a practice question/);
    const secondForm=new FormData();secondForm.append('file',new Blob([prefix+late]),'original-all-source.txt');
    const second=await(await fetch(base+'/api/import',{method:'POST',body:secondForm})).json();
    response=await post({courseId:second.id});assert.equal(response.status,200);assert.match((await response.json()).prompt,/late source passage/);
  }finally{
    const ended=new Promise<void>(resolve=>child.once('exit',()=>resolve()));if(child.exitCode===null){child.kill();await ended;}
    rmSync(directory,{recursive:true,force:true});
  }
});
