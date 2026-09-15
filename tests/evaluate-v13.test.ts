import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gateCaseRead,identifyTaggedModels,objectHash,outputDiagnostics,resumeKey,sourceGraph,validateFreeze,validateResumeConfiguration,type EvaluationCase,type FrozenIdentity} from '../scripts/evaluate-v13-core.ts';

const identity:FrozenIdentity={schemaVersion:1,datasetLockSha256:'data',runnerSha256:'runner',pipelines:{'frozen-grounded':{hash:'old',files:{}},supported:{hash:'new',files:{}}},model:{generation:{name:'qwen3:4b',digest:'g',tagParameters:'temperature 0.6',capabilities:['completion','thinking']},supportedGeneration:{name:'qwen3.5:4b',digest:'candidate',tagParameters:'presence_penalty 1.5',capabilities:['completion','thinking','vision']},embedding:{name:'embedding',digest:'e',tagParameters:null,capabilities:['embedding']},ollamaVersion:'test'},options:{'frozen-grounded':{model:'qwen3:4b',think:false},supported:{model:'qwen3.5:4b',think:false,num_predict:1800}},deadlineMs:180000,scoringProtocols:{'protocol.json':'protocol'}};
const frozen=()=>({...structuredClone(identity),state:'frozen',frozenAt:'2026-09-15T00:00:00.000Z',authorization:'one-shot holdout requested by root'});
const item:EvaluationCase={id:'development-1',split:'development',documentId:'doc',documentHash:'material',category:'source-answerable',language:'en',tags:[],question:'What is the stated value?',reference:'The stated value is 240.',supportIds:['p1'],requiredFacts:['The value is 240.'],forbiddenClaims:['The value is 120.'],expectedInsufficient:false};

test('a missing or changed freeze fails before a sealed file reader is called',()=>{
 let reads=0;
 const read=()=>{gateCaseRead('holdout','unused-sealed-path',undefined,identity);reads++;};
 assert.throws(read,/sealed/);assert.equal(reads,0);
 const changed=frozen();changed.options.supported={think:true,num_predict:1800};
 assert.throws(()=>{gateCaseRead('holdout','unused-sealed-path',changed,identity);reads++;},/Frozen options differs/);
 assert.equal(reads,0);
 assert.doesNotThrow(()=>validateFreeze(frozen(),identity));
});

test('development cannot read a innocently named symlink to a sealed case file',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tracelearn-gate-'));
 try{
  const sealed=join(dir,'holdout-sealed');mkdirSync(sealed);
  const target=join(sealed,'questions.json');writeFileSync(target,'private test marker');
  const alias=join(dir,'development.json');symlinkSync(target,alias);
  let contentRead=false;
  assert.throws(()=>{gateCaseRead('development',alias,undefined,identity);readFileSync(alias);contentRead=true;},/symlink target/);
  assert.equal(contentRead,false);
  const ordinary=join(dir,'ordinary-development.json');writeFileSync(ordinary,'[]');
  assert.doesNotThrow(()=>gateCaseRead('development',ordinary,undefined,identity));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('resume identity changes when any case, mode, pipeline or material changes',()=>{
 const key=resumeKey(item,'supported','pipeline','material');
 assert.equal(resumeKey(structuredClone(item),'supported','pipeline','material'),key);
 for(const other of [resumeKey({...item,question:'A changed question'},'supported','pipeline','material'),resumeKey(item,'frozen-grounded','pipeline','material'),resumeKey(item,'supported','changed','material'),resumeKey(item,'supported','pipeline','changed')])assert.notEqual(other,key);
});

test('source fingerprint follows imported helpers and directory index imports',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tracelearn-graph-'));
 try{
  mkdirSync(join(dir,'helpers'));
  writeFileSync(join(dir,'entry.ts'),"import {value} from './helpers';\nexport {value};");
  writeFileSync(join(dir,'helpers/index.ts'),'export const value=1;');
  const before=sourceGraph(dir,'entry.ts');
  assert.deepEqual(Object.keys(before.files),['entry.ts','helpers/index.ts']);
  writeFileSync(join(dir,'helpers/index.ts'),'export const value=2;');
  assert.notEqual(sourceGraph(dir,'entry.ts').hash,before.hash);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('exact supporting quotes never become an automatic semantic correctness score',()=>{
 const result=outputDiagnostics(item,{answer:'The value is 120.',insufficient:false,citations:[{sectionId:'p1',quote:'The value is 240.'}],sources:[{id:'p1',text:'The value is 240.'}]});
 assert.equal(result.exactQuoteChecks[0].exact,true);
 assert.equal(result.semanticCorrectness,null);
 assert.equal(result.semanticReviewRequired,true);
});

test('unverified is no-answer even when the legacy insufficient flag is true',()=>{
 const result=outputDiagnostics({...item,expectedInsufficient:true},{insufficient:true,support:{outcome:'unverified'}});
 assert.equal(result.deliveredAnswer,false);assert.equal(result.deliveredRefusal,false);
 assert.equal(result.unverified,true);assert.equal(result.expectedRefusalMarkerMatches,null);
 assert.equal(objectHash({b:2,a:1}),objectHash({a:1,b:2}));
});

test('model metadata retains the actual candidate and tag defaults without private show fields',async()=>{
 const result=await identifyTaggedModels({generation:'old:4b',supportedGeneration:'new:4b',embedding:'embed:small'},[{name:'old:4b',digest:'old-digest'},{name:'new:4b',digest:'new-digest'},{name:'embed:small',digest:'embed-digest'}],async name=>({parameters:name==='new:4b'?'presence_penalty 1.5\ntop_p 0.95':undefined,capabilities:name==='embed:small'?['embedding']:['thinking','completion'],modelfile:'FROM /private/example',system:'do not retain'}));
 assert.equal(result.generation.name,'old:4b');assert.equal(result.supportedGeneration.name,'new:4b');
 assert.equal(result.supportedGeneration.digest,'new-digest');
 assert.equal(result.supportedGeneration.tagParameters,'presence_penalty 1.5\ntop_p 0.95');
 assert.equal(result.embedding.tagParameters,null);
 assert.doesNotMatch(JSON.stringify(result),/private|modelfile|system|do not retain/);
});

test('a missing supported model is named precisely and never falls back to the historical model',async()=>{
 let calls=0;
 await assert.rejects(identifyTaggedModels({generation:'old:4b',supportedGeneration:'missing:4b',embedding:'embed:small'},[{name:'old:4b',digest:'old-digest'},{name:'embed:small',digest:'embed-digest'}],async()=>{calls++;return{capabilities:[]};}),/Required supportedGeneration model is not installed or has no digest: missing:4b/);
 assert.equal(calls,0);
});

test('changed candidate digest or tag defaults cannot reuse a resume manifest or holdout freeze',()=>{
 const manifest={configurationHash:objectHash(identity),configuration:structuredClone(identity)};
 assert.doesNotThrow(()=>validateResumeConfiguration(manifest,structuredClone(identity)));
 for(const field of ['digest','tagParameters'] as const){
  const changed=structuredClone(identity);changed.model.supportedGeneration[field]='changed';
  assert.throws(()=>validateResumeConfiguration(manifest,changed),/different configuration/);
  assert.throws(()=>validateFreeze(frozen(),changed),/Frozen model differs/);
 }
 const missingNewField:any=structuredClone(identity);delete missingNewField.model.supportedGeneration;
 assert.throws(()=>validateResumeConfiguration({configurationHash:objectHash(missingNewField),configuration:missingNewField},identity),/different configuration/);
});

test('a shared generation tag is inspected once while preserving separate pipeline identities',async()=>{
 const inspected:string[]=[];
 const result=await identifyTaggedModels({generation:'same:4b',supportedGeneration:'same:4b',embedding:'embed:small'},[{name:'same:4b',digest:'same-digest'},{name:'embed:small',digest:'embed-digest'}],async name=>{inspected.push(name);return{parameters:'',capabilities:[]};});
 assert.deepEqual(inspected.sort(),['embed:small','same:4b']);
 assert.deepEqual(result.generation,result.supportedGeneration);
});
