import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Course} from '../content/course.ts';
import type {GeneratedPractice} from '../server/practice-planner.ts';

const temporary=mkdtempSync(join(tmpdir(),'tracelearn-practice-generation-'));
process.env.TRACELEARN_DATA=temporary;
const {createPracticeGenerator}=await import('../server/practice-generation.ts');
const {AppError,generatedFormat}=await import('../server/ai.ts');
const {db}=await import('../server/store.ts');
after(()=>{db.close();rmSync(temporary,{recursive:true,force:true});});
const course:Course={id:'fixture',title:'Fixture',subtitle:'Deterministic quality-repair fixture',builtin:false,hash:'test-source-hash',createdAt:'2026-09-15',sections:[{id:'count',page:1,title:'Count',text:'COUNT(score) counts only non-NULL scores, while COUNT(*) counts every row.'}]};
const question:GeneratedPractice={concept:'Source recall · Count',prompt:'Complete the exact statement from your notes (verbatim recall).\n\nCOUNT(score) counts only _____ scores, while COUNT(*) counts every row.',quote:course.sections[0].text,options:['NULL','non-NULL','not null','UNKNOWN'],correct:1,explanation:'The original source states: '+course.sections[0].text,sourceIds:['count']};
const response=(distractors:string[])=>({raw:JSON.stringify({distractors}),data:{distractors},stats:{totalDurationMs:1,promptTokens:1,outputTokens:1}});

test('good original options return without a repair or a second frozen-generator invocation',async()=>{
 let originals=0,repairs=0;
 const accepted={...question,options:['NULL','non-NULL','FALSE','UNKNOWN']};
 const generate=createPracticeGenerator({generateQuestion:async()=>{originals++;return accepted},chatJSON:async()=>{repairs++;throw Error('unexpected repair')}});
 assert.deepEqual(await generate(course,'en'),accepted);assert.equal(originals,1);assert.equal(repairs,0);
});

test('quality repair uses a new prompt with rejected options and preserves exact provenance and answer position',async()=>{
 let originals=0,repairs=0;
 const signal=new AbortController().signal;
 const generate=createPracticeGenerator({generateQuestion:async(c,language,s)=>{originals++;assert.equal(c,course);assert.equal(language,'en');assert.equal(s,signal);return question},chatJSON:async(system,user,format,s)=>{
   repairs++;assert.match(system,/Repair the rejected options/);assert.match(system,/non-NULL, non NULL, not NULL, and IS NOT NULL/);assert.match(system,/untrusted data/);
   assert.deepEqual(JSON.parse(user),{correctPhrase:'non-NULL',sourceSentence:question.quote,rejectedOptions:question.options});assert.equal(format,generatedFormat);assert.equal(s,signal);
   return response(['TRUE','FALSE','zero']);
 }});
 const repaired=await generate(course,'en',signal);
 assert.equal(originals,1);assert.equal(repairs,1);assert.deepEqual(repaired,{...question,options:['TRUE','non-NULL','FALSE','zero']});
 assert.equal(repaired.prompt.split('\n\n')[1].replace('_____',repaired.options[repaired.correct]),repaired.quote);
 assert.deepEqual(question.options,['NULL','non-NULL','not null','UNKNOWN']);
});

test('a second ambiguous or malformed output fails clearly after one repair',async()=>{
 for(const output of [response(['IS NOT NULL','TRUE','FALSE']),response(['TRUE',' true ','FALSE']),response(['','TRUE','FALSE']),{...response(['TRUE','FALSE','zero']),data:{distractors:['TRUE']}}]){
   let originals=0,repairs=0;
   const generate=createPracticeGenerator({generateQuestion:async()=>{originals++;return question},chatJSON:async()=>{repairs++;return output}});
   await assert.rejects(()=>generate(course,'en'),error=>error instanceof AppError&&error.status===502&&/after one quality repair/.test(error.message));
   assert.equal(originals,1);assert.equal(repairs,1);
 }
});

test('model unavailability and cancellation do not start an additional repair',async()=>{
 let repairs=0;
 const unavailable=createPracticeGenerator({generateQuestion:async()=>{throw new AppError('offline',503)},chatJSON:async()=>{repairs++;return response(['TRUE','FALSE','zero'])}});
 await assert.rejects(()=>unavailable(course,'en'),error=>error instanceof AppError&&error.status===503);assert.equal(repairs,0);
 const controller=new AbortController();
 const cancelled=createPracticeGenerator({generateQuestion:async()=>{controller.abort();return question},chatJSON:async()=>{repairs++;return response(['TRUE','FALSE','zero'])}});
 await assert.rejects(()=>cancelled(course,'en',controller.signal),error=>error instanceof AppError&&error.status===499);assert.equal(repairs,0);
});


test('body-read cancellation becomes 499 in both original and repair calls',async()=>{
 for(const phase of ['original','repair']){
   const controller=new AbortController();let originals=0,repairs=0;
   const bodyAbort=()=>{controller.abort();throw new DOMException('Body stream interrupted','AbortError')};
   const generate=createPracticeGenerator({generateQuestion:async()=>{originals++;if(phase==='original')return bodyAbort();return question},chatJSON:async()=>{repairs++;return bodyAbort()}});
   await assert.rejects(()=>generate(course,'en',controller.signal),error=>error instanceof AppError&&error.status===499&&error.message==='Generation cancelled.');
   assert.equal(originals,1);assert.equal(repairs,phase==='repair'?1:0);
 }
});

test('body-read interruption without caller cancellation becomes 503 and retains genuine AppError status',async()=>{
 for(const phase of ['original','repair'])for(const name of ['AbortError','TimeoutError']){
   let repairs=0;
   const interrupted=()=>{throw new DOMException('Body unavailable',name)};
   const generate=createPracticeGenerator({generateQuestion:async()=>phase==='original'?interrupted():question,chatJSON:async()=>{repairs++;return interrupted()}});
   await assert.rejects(()=>generate(course,'en'),error=>error instanceof AppError&&error.status===503&&/interrupted or timed out/.test(error.message));
   assert.equal(repairs,phase==='repair'?1:0);
 }
 const upstream=new AppError('The model returned a specific failure.',429);
 const generate=createPracticeGenerator({generateQuestion:async()=>question,chatJSON:async()=>{throw upstream}});
 await assert.rejects(()=>generate(course,'en'),error=>error===upstream);
});
