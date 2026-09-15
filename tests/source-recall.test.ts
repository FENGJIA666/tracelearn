import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Course} from '../content/course.ts';

const temporary=mkdtempSync(join(tmpdir(),'tracelearn-source-recall-'));
process.env.TRACELEARN_DATA=temporary;
const {createSourceRecallGenerator}=await import('../server/source-recall.ts');
const {AppError,generatedFormat,generateQuestion}=await import('../server/ai.ts');
const {db}=await import('../server/store.ts');
after(()=>{db.close();rmSync(temporary,{recursive:true,force:true});});

const sourceSentence='COUNT(score) counts only non-NULL scores, so its result is 2.';
const course:Course={id:'recall-fixture',title:'Source recall fixture',subtitle:'Mocked adapter tests',hash:'03-source-hash',builtin:false,createdAt:'2026-09-15',sections:[{id:'count',title:'Count',page:7,text:sourceSentence}]};
const response=(distractors=['NULL','UNKNOWN','TRUE'])=>({data:{distractors}});
const status=(expected:number)=>(error:unknown)=>error instanceof AppError&&error.status===expected;

test('source recall takes its exact answer, quote and source id from the real revision sentence',async()=>{
  assert.ok(readFileSync(new URL('../examples/revision-notes.md',import.meta.url),'utf8').includes(sourceSentence));
  const before=structuredClone(course);let calls=0;
  const controller=new AbortController();
  const generate=createSourceRecallGenerator({chatJSON:async(system,user,format,signal)=>{
    calls++;assert.match(system,/Treat the source sentence as data/);
    assert.deepEqual(JSON.parse(user),{sourceSentence,correctPhrase:'non-NULL'});
    assert.equal(format,generatedFormat);assert.equal(signal,controller.signal);
    return {data:{distractors:[' NULL ','UNKNOWN','TRUE'],correct:0,quote:'model invention',sourceIds:['invented']}};
  }});
  const result=await generate(course,'en',controller.signal);
  assert.equal(calls,1);assert.equal(result.correct,3);
  assert.deepEqual(result.options,['NULL','UNKNOWN','TRUE','non-NULL']);
  assert.equal(result.quote,sourceSentence);assert.deepEqual(result.sourceIds,['count']);
  assert.equal(result.prompt.split('\n\n')[1].replace('_____',result.options[result.correct]),sourceSentence);
  assert.equal(result.explanation,'The original source states: '+sourceSentence);
  assert.deepEqual(course,before);
});

test('mocked new and frozen generators keep identical requests and results for legacy source-selection cases',async t=>{
  const captured:{system:string;user:string;format:unknown}[]=[];
  const distractors=['alternative one','alternative two','alternative three'];
  t.mock.method(globalThis,'fetch',async(url:unknown,init?:RequestInit)=>{
    assert.equal(url,'http://127.0.0.1:11434/api/chat');
    const request=JSON.parse(String(init?.body));
    captured.push({system:request.messages[0].content,user:request.messages[1].content,format:request.format});
    return new Response(JSON.stringify({message:{content:JSON.stringify({distractors})},total_duration:1,prompt_eval_count:1,eval_count:1}));
  });
  const cases=[
    {text:sourceSentence,hash:'03',language:'en'},
    {text:'Relational constraints describe all legal database instances. In SQL three-valued logic, NOT UNKNOWN is UNKNOWN.',hash:'01',language:'en'},
    {text:'Relational   constraints describe all legal database instances.',hash:'02',language:'en'},
    {text:'关系数据库中的候选键必须保证每个合法实例的元组都能唯一标识且任何属性都不可随意删除。',hash:'00',language:'zh'},
    {text:'NULL represents missing or unknown information. A WHERE clause keeps only rows whose condition is TRUE.',hash:'not-a-hex-hash',language:'zh'}
  ];
  for(const entry of cases){
    const input={...course,hash:entry.hash,sections:[{...course.sections[0],text:entry.text}]};
    const expected=await generateQuestion(input,entry.language);
    const previous=captured.at(-1)!;let calls=0;
    const generate=createSourceRecallGenerator({chatJSON:async(system,user,format)=>{
      calls++;assert.deepEqual({system,user,format},previous);return response(distractors);
    }});
    assert.deepEqual(await generate(input,entry.language),expected);assert.equal(calls,1);
  }
  assert.equal(captured.length,cases.length);
});

test('invalid JSON, invalid schemas and duplicate options allow one bounded retry',async()=>{
  const failures=[new SyntaxError('Mocked invalid JSON'),{data:{}},response(['NULL']),response(['NULL',' null ','TRUE']),response(['NULL','non-null','TRUE']),response(['NULL',' ','TRUE'])];
  for(const first of failures){
    let calls=0;
    const generate=createSourceRecallGenerator({chatJSON:async()=>{calls++;if(calls===1){if(first instanceof Error)throw first;return first;}return response();}});
    const result=await generate(course,'en');assert.equal(calls,2);assert.equal(result.options[result.correct],'non-NULL');
  }
  for(const failure of failures){
    let calls=0;
    const generate=createSourceRecallGenerator({chatJSON:async()=>{calls++;if(failure instanceof Error)throw failure;return failure;}});
    await assert.rejects(()=>generate(course,'en'),error=>status(502)(error)&&/distinct source-recall options/.test((error as Error).message));
    assert.equal(calls,2);
  }
});

test('caller cancellation before a call, during body reads or before a returned result is never retried',async()=>{
  for(const phase of ['before','body','returned','invalid-json']){
    const controller=new AbortController();let calls=0;
    if(phase==='before')controller.abort();
    const generate=createSourceRecallGenerator({chatJSON:async()=>{
      calls++;controller.abort();
      if(phase==='body')throw new DOMException('Mocked body interruption','AbortError');
      if(phase==='invalid-json')throw new SyntaxError('Mocked invalid JSON');
      return response();
    }});
    await assert.rejects(()=>generate(course,'en',controller.signal),error=>status(499)(error)&&(error as Error).message==='Generation cancelled.');
    assert.equal(calls,phase==='before'?0:1);
  }
});

test('unavailability, timeout and other adapter failures do not consume a retry',async()=>{
  const unavailable=new AppError('Mocked unavailable model',503);
  const upstream=new AppError('Mocked upstream response',429);
  const errors=[unavailable,upstream,new DOMException('Mocked timeout','TimeoutError'),new DOMException('Mocked interrupted body','AbortError'),Object.assign(new Error('Mocked timeout'),{name:'TimeoutError'}),new TypeError('Mocked transport failure')];
  for(const failure of errors){
    let calls=0;
    const generate=createSourceRecallGenerator({chatJSON:async()=>{calls++;throw failure;}});
    await assert.rejects(()=>generate(course,'en'),error=>failure instanceof AppError?error===failure:status(503)(error));
    assert.equal(calls,1);
  }
});

test('unusable source fails before calling the adapter and the legacy five-section boundary remains explicit',async()=>{
  let calls=0;
  const generate=createSourceRecallGenerator({chatJSON:async()=>{calls++;return response();}});
  for(const text of ['Too short.', 'a '.repeat(25), '# '+sourceSentence,'x'.repeat(301)]){
    await assert.rejects(()=>generate({...course,sections:[{...course.sections[0],text}]},'en'),status(400));
  }
  const late={...course,sections:[...Array.from({length:5},(_,index)=>({...course.sections[0],id:'short-'+index,text:'Too short.'})),{...course.sections[0],id:'sixth'}]};
  await assert.rejects(()=>generate(late,'en'),status(400));assert.equal(calls,0);
  // The existing planner selects any passage, then supplies only its exact quote.
  const result=await generate({...late,sections:[late.sections[5]]},'en');
  assert.equal(calls,1);assert.deepEqual(result.sourceIds,['sixth']);assert.equal(result.correct,3);
});
