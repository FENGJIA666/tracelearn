import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';

// Start BOTH the app and Ollama under scripts/offline.sb before invoking this
// read-only network probe plus two original-course Ask requests. Use a new DB.
const [base,outPath]=process.argv.slice(2);
assert.match(base??'',/^http:\/\/127\.0\.0\.1:\d+$/,'Supply an isolated loopback app URL and a new output path.');
assert.notEqual(new URL(base).port,'4317','Keep acceptance history out of the user installation.');
assert.ok(outPath&&!existsSync(outPath),'Use a new output path; prior evidence is preserved.');
const out:any={startedAt:new Date().toISOString(),base,
 scope:'App and Ollama must be started under the recorded macOS localhost-only process policy. Whole-computer and browser networking are not disabled. Model files and dependencies were installed beforehand.',
 policySha256:createHash('sha256').update(readFileSync('scripts/offline.sb')).digest('hex'),
 coldDefinition:'Ollama restarted, no model loaded, and fresh isolated course storage without cached source vectors. Warm repeats the same question after the cold request.',
 checks:[],semanticReview:{independentHumanReview:false,reviewer:'Pending Codex-assisted reading',correct:null}};
const save=()=>writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
writeFileSync(outPath,JSON.stringify(out,null,2)+'\n',{flag:'wx'});
try{
 for(const url of ['https://example.com','http://1.1.1.1']){
  const result=spawnSync('sandbox-exec',['-f','scripts/offline.sb','curl','--noproxy','*','-I','--max-time','5',url],{encoding:'utf8'});
  out.checks.push({name:'same-policy-denies-external-curl',url,exitCode:result.status,stderr:result.stderr.slice(-1000)});save();
  assert.notEqual(result.status,0,'External network unexpectedly available under the policy.');
 }
 for(const [name,url] of [['identity',base+'/api/identity'],['status',base+'/api/status'],['modelsBefore','http://127.0.0.1:11434/api/ps']]){
  const response=await fetch(url,{signal:AbortSignal.timeout(5000)});assert.ok(response.ok);out[name]=await response.json();save();
 }
 assert.equal(out.status.ready,true);assert.equal(out.status.model,'qwen3.5:9b');
 assert.equal(out.modelsBefore.models.length,0,'Cold measurement requires a restarted, empty model runtime.');
 const body={courseId:'database-foundations',question:'For salaries 100, 200, and NULL, which rows survive WHERE salary <> 100, and why?',language:'en'};
 for(const name of ['cold','warm']){
  const started=performance.now();
  const response=await fetch(base+'/api/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(190000)});
  const rawBody=await response.text();
  const row={name,status:response.status,wallMs:Math.round(performance.now()-started),request:body,rawBody,data:JSON.parse(rawBody)};
  out.checks.push(row);save();console.log(JSON.stringify({name,status:row.status,wallMs:row.wallMs,answer:row.data.answer}));
  assert.equal(response.status,200);assert.equal(row.data.support?.outcome,'supported');
 }
 out.modelsAfter=await(await fetch('http://127.0.0.1:11434/api/ps')).json();
 out.memoryNote='Ollama allocation snapshot, not whole-system or peak memory; model eviction and other applications can affect residency.';
 out.completed=true;out.finishedAt=new Date().toISOString();save();
}catch(error){out.completed=false;out.error=String(error);out.finishedAt=new Date().toISOString();save();throw error;}
