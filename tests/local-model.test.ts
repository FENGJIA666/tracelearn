import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// ai.ts imports the store. Isolate it before loading either module.
const data=mkdtempSync(join(tmpdir(),'tracelearn-local-model-'));
const originalData=process.env.TRACELEARN_DATA,originalModel=process.env.TRACELEARN_ANSWER_MODEL;
process.env.TRACELEARN_DATA=data;
process.env.TRACELEARN_ANSWER_MODEL='qwen3.5:4b';
const {CURRENT_MODEL,EMBED,OPTIONS,THINK,localChatRaw,localChatJSON,modelStatus}=await import('../server/local-model.ts');
const {AppError}=await import('../server/ai.ts');
const {db}=await import('../server/store.ts');
after(()=>{
 db.close();rmSync(data,{recursive:true,force:true});
 if(originalData===undefined)delete process.env.TRACELEARN_DATA;else process.env.TRACELEARN_DATA=originalData;
 if(originalModel===undefined)delete process.env.TRACELEARN_ANSWER_MODEL;else process.env.TRACELEARN_ANSWER_MODEL=originalModel;
});
const envelope=(raw='{"answer":"A checked response."}')=>({message:{content:raw},total_duration:1_250_000_000,prompt_eval_count:123,eval_count:37});
const validResponse=(raw?:string)=>Response.json(envelope(raw));
const hasStatus=(status:number,pattern?:RegExp)=>(error:unknown)=>{
 assert.ok(error instanceof AppError);assert.equal(error.status,status);
 if(pattern)assert.match(error.message,pattern);return true;
};
const tags=(names:string[])=>Response.json({models:names.map((name,i)=>({name,digest:`sha256:${i}`,size:100+i}))});

test('one chat request uses the actual configured model and refuses implicit source truncation',async t=>{
 const controller=new AbortController();
 const format={type:'object',properties:{answer:{type:'string'}}};
 const fetch=t.mock.method(globalThis,'fetch',async (url:unknown,init?:RequestInit)=>{
  assert.equal(url,'http://127.0.0.1:11434/api/chat');
  assert.equal(init?.method,'POST');
  assert.ok(init?.signal instanceof AbortSignal);
  const body=JSON.parse(init?.body as string);
  assert.deepEqual(body,{model:'qwen3.5:4b',think:false,stream:false,truncate:false,format,options:OPTIONS,keep_alive:'30m',messages:[{role:'system',content:'Evidence policy'},{role:'user',content:'Question and complete source'}]});
  assert.equal(Object.hasOwn(body.options,'truncate'),false);
  return validResponse();
 });
 const result=await localChatRaw('Evidence policy','Question and complete source',format,controller.signal);
 assert.equal(CURRENT_MODEL,'qwen3.5:4b');assert.equal(THINK,false);
 assert.equal(OPTIONS.num_ctx,16384);assert.equal(OPTIONS.num_predict,1800);
 assert.deepEqual(result,{raw:'{"answer":"A checked response."}',stats:{totalDurationMs:1250,promptTokens:123,outputTokens:37}});
 assert.equal(fetch.mock.callCount(),1);
});

test('official context-limit 400 families become an actionable 400 without retry',async t=>{
 const messages=[
  'the prompt is longer than the context length currently available to the model; shorten the prompt, adjust the context length in settings, or use a model with a longer context length',
  'the input length exceeds the context length',
  JSON.stringify({error:{code:400,message:'request (9021 tokens) exceeds the available context size (8192 tokens), try increasing it'}})
 ];
 const fetch=t.mock.method(globalThis,'fetch',async()=>Response.json({error:messages.shift()},{status:400}));
 for(let i=0;i<3;i++)await assert.rejects(localChatRaw('s','u',{}),hasStatus(400,/Shorten the question or import a smaller source/));
 assert.equal(fetch.mock.callCount(),3);
});

test('other 400 errors, including context settings errors, are not mislabeled as oversized sources',async t=>{
 const messages=['invalid format: expected a JSON schema','invalid context length setting','model does not support chat'];
 const fetch=t.mock.method(globalThis,'fetch',async()=>Response.json({error:messages.shift()},{status:400}));
 for(let i=0;i<3;i++)await assert.rejects(localChatRaw('s','u',{}),error=>{
  assert.ok(error instanceof AppError);assert.equal(error.status,503);
  assert.match(error.message,/rejected this request \(HTTP 400\)/);
  assert.doesNotMatch(error.message,/Shorten|exceeds|discarded/);return true;
 });
 assert.equal(fetch.mock.callCount(),3);
});

test('a missing generation model names the configured model, not the legacy evaluation model',async t=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({error:'model not found'},{status:404}));
 await assert.rejects(localChatRaw('s','u',{}),hasStatus(503,/qwen3\.5:4b/));
});

test('offline transport is one request and a recoverable 503',async t=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('fetch failed');});
 await assert.rejects(localChatRaw('s','u',{}),hasStatus(503,/Start Ollama/));
 assert.equal(fetch.mock.callCount(),1);
});

test('an already cancelled request never reaches fetch',async t=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>validResponse());
 const controller=new AbortController();controller.abort();
 await assert.rejects(localChatRaw('s','u',{},controller.signal),hasStatus(499));
 assert.equal(fetch.mock.callCount(),0);
});

test('caller cancellation during response reading wins over a transport failure',async t=>{
 const controller=new AbortController();
 const fetch=t.mock.method(globalThis,'fetch',async (_url:unknown,init?:RequestInit)=>({
  ok:true,status:200,json:async()=>{
   controller.abort();assert.equal(init?.signal?.aborted,true);
   throw new DOMException('The operation was aborted.','AbortError');
  }
 }) as unknown as Response);
 await assert.rejects(localChatRaw('s','u',{},controller.signal),hasStatus(499));
 assert.equal(fetch.mock.callCount(),1);
});

test('a response that arrives after caller cancellation is discarded even when fetch ignores abort',async t=>{
 const controller=new AbortController();
 t.mock.method(globalThis,'fetch',async()=>{controller.abort();return validResponse();});
 await assert.rejects(localChatRaw('s','u',{},controller.signal),hasStatus(499));
});

test('the per-call deadline covers reading the response, without waiting 120 seconds',async t=>{
 const deadline=new AbortController();
 const timeout=t.mock.method(AbortSignal,'timeout',(milliseconds:number)=>{assert.equal(milliseconds,120_000);return deadline.signal;});
 const caller=new AbortController();
 const fetch=t.mock.method(globalThis,'fetch',async (_url:unknown,init?:RequestInit)=>({
  ok:true,status:200,json:async()=>{
   deadline.abort(new DOMException('Timed out','TimeoutError'));
   assert.equal(init?.signal?.aborted,true);assert.equal(caller.signal.aborted,false);
   return envelope();
  }
 }) as Response);
 await assert.rejects(localChatRaw('s','u',{},caller.signal),hasStatus(503,/timed out/));
 assert.equal(fetch.mock.callCount(),1);assert.equal(timeout.mock.callCount(),1);
});

test('malformed transport JSON and response envelopes become 503 errors',async t=>{
 const responses=[new Response('{broken'),Response.json({message:{content:42}}),Response.json({...envelope(),prompt_eval_count:'123'}),Response.json({error:'model failed'})];
 const fetch=t.mock.method(globalThis,'fetch',async()=>responses.shift()!);
 for(let i=0;i<4;i++)await assert.rejects(localChatRaw('s','u',{}),hasStatus(503,/unreadable response/));
 assert.equal(fetch.mock.callCount(),4);
});

test('localChatJSON parses content and preserves invalid generated JSON for caller validation retry',async t=>{
 const outputs=['not valid JSON','{"value":240}'];
 const fetch=t.mock.method(globalThis,'fetch',async()=>validResponse(outputs.shift()));
 await assert.rejects(localChatJSON('s','u',{}),error=>{
  assert.ok(error instanceof SyntaxError);assert.equal(error instanceof AppError,false);
  const audited=error as SyntaxError&{raw:string;stats:{outputTokens:number}};
  assert.equal(audited.raw,'not valid JSON');assert.equal(audited.stats.outputTokens,37);return true;
 });
 assert.deepEqual((await localChatJSON('s','u',{})).data,{value:240});
 assert.equal(fetch.mock.callCount(),2);
});

test('ready depends only on the configured generation model and embedding model',async t=>{
 const lists=[[CURRENT_MODEL,EMBED],['qwen3:4b',EMBED],[CURRENT_MODEL],[CURRENT_MODEL,EMBED,'unrelated:latest']];
 const fetch=t.mock.method(globalThis,'fetch',async(url:unknown)=>{assert.equal(url,'http://127.0.0.1:11434/api/tags');return tags(lists.shift()!);});
 const first=await modelStatus();
 assert.equal(first.online,true);assert.equal(first.ready,true);
 assert.equal(first.model,CURRENT_MODEL);assert.equal(first.embedding,EMBED);
 assert.deepEqual(first.models,[{name:CURRENT_MODEL,digest:'sha256:0',size:100},{name:EMBED,digest:'sha256:1',size:101}]);
 assert.equal((await modelStatus()).ready,false);
 assert.equal((await modelStatus()).ready,false);
 assert.equal((await modelStatus()).ready,true);
 assert.equal(fetch.mock.callCount(),4);
});

test('failed or malformed status responses never claim ready and retain compatibility fields',async t=>{
 const responses=[Response.json({models:[{name:CURRENT_MODEL},{name:EMBED}]},{status:503}),Response.json({models:[{name:3}]}),new Response('broken')];
 const fetch=t.mock.method(globalThis,'fetch',async()=>{const response=responses.shift();if(response)return response;throw new TypeError('offline');});
 for(let i=0;i<4;i++)assert.deepEqual(await modelStatus(),{online:false,ready:false,model:CURRENT_MODEL,embedding:EMBED,models:[]});
 assert.equal(fetch.mock.callCount(),4);
});
