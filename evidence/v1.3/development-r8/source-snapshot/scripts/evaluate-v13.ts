import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import type {Course} from '../content/course.ts';
import {canonicalJson,fileHash,gateCaseRead,identifyTaggedModels,objectHash,outputDiagnostics,readLockedJson,resumeKey,sourceGraph,validateDataset,validateResumeConfiguration,type DatasetLock,type EvaluationCase,type FrozenIdentity,type Mode,type SourceDocument,type Split} from './evaluate-v13-core.ts';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const HELP=`TraceLearn v1.3 evaluation (no automatic semantic scoring)

Development:
  npx tsx scripts/evaluate-v13.ts --split development --documents evaluation-v13/documents.json --cases evaluation-v13/development.json --dataset-lock evaluation-v13/dataset-lock.json --scoring-protocol evaluation-v13/scoring-protocol.json --scoring-protocol evaluation-v13/scoring-protocol.md --out evidence/v1.3/development-run

Options:
  --describe-config       Print freeze identity/template; do not read cases or run inference.
  --validate-only         Validate selected inputs and resume configuration, without inference.
  --split development|holdout
  --documents PATH        Explicit locked source document JSON.
  --cases PATH            Explicit locked case JSON; required for runs/validation.
  --dataset-lock PATH     Dataset lock; required.
  --scoring-protocol PATH Repeat for every protocol file to freeze (JSON and Markdown).
  --out DIR               New or configuration-identical results directory.
  --freeze PATH           Required for holdout. The runner never creates an authorized freeze.
  --deadline-ms N         Whole-call deadline for both pipelines; default 180000.
  --modes LIST            frozen-grounded,supported (default both).
  --case ID               Development-only; repeat to select exact case IDs.
  --limit N               Development-only; first N selected cases.

Holdout first validates an explicit root-authorized frozen candidate/configuration,
then opens the sealed case file. Holdout selection must include the complete split
and both modes. Errors and unverified responses are retained; neither counts as a
correct refusal. Changed code, models, data, options or runner cannot append to a
previous configuration. Resume skips complete exact keys, including failed runs.
Historical and supported generation model names/digests are recorded separately.
Tag defaults from /api/show are recorded alongside explicit request options;
changing a model name does not imply a weights-only comparison.
`;

type Args={split?:Split;documents?:string;cases?:string;lock?:string;protocols:string[];out?:string;freeze?:string;deadlineMs:number;modes:Mode[];caseIds:string[];limit?:number;describe:boolean;validateOnly:boolean;help:boolean};
function parseArgs(argv:string[]):Args{
 const args:Args={protocols:[],deadlineMs:180000,modes:['frozen-grounded','supported'],caseIds:[],describe:false,validateOnly:false,help:false};
 for(let i=0;i<argv.length;i++){
  const flag=argv[i];
  if(flag==='--help'){args.help=true;continue;}if(flag==='--describe-config'){args.describe=true;continue;}if(flag==='--validate-only'){args.validateOnly=true;continue;}
  const value=argv[++i];if(!value||value.startsWith('--'))throw Error(`Missing value for ${flag}`);
  if(flag==='--split'){if(!['development','holdout'].includes(value))throw Error('Invalid split.');args.split=value as Split;}
  else if(flag==='--documents')args.documents=resolve(value);
  else if(flag==='--cases')args.cases=resolve(value);
  else if(flag==='--dataset-lock')args.lock=resolve(value);
  else if(flag==='--out')args.out=resolve(value);
  else if(flag==='--freeze')args.freeze=resolve(value);
  else if(flag==='--scoring-protocol')args.protocols.push(resolve(value));
  else if(flag==='--case')args.caseIds.push(value);
  else if(flag==='--deadline-ms'){args.deadlineMs=Number(value);if(!Number.isInteger(args.deadlineMs)||args.deadlineMs<1000||args.deadlineMs>600000)throw Error('Deadline must be 1000–600000 ms.');}
  else if(flag==='--limit'){args.limit=Number(value);if(!Number.isInteger(args.limit)||args.limit<1)throw Error('Limit must be a positive integer.');}
  else if(flag==='--modes'){const modes=value.split(',');if(!modes.length||new Set(modes).size!==modes.length||modes.some(mode=>!['frozen-grounded','supported'].includes(mode)))throw Error('Invalid or repeated pipeline mode.');args.modes=modes as Mode[];}
  else throw Error(`Unknown option ${flag}`);
 }
 if(args.help)return args;
 if(!args.documents||!args.lock||!args.protocols.length)throw Error('Provide --documents, --dataset-lock, and --scoring-protocol.');
 if(!args.describe&&(!args.split||!args.cases||!args.out))throw Error('Provide explicit --split, --cases and --out.');
 if(args.split==='holdout'&&(args.caseIds.length||args.limit!==undefined||args.modes.length!==2))throw Error('Holdout must run the whole split in both modes; exact interrupted runs can resume.');
 if(args.split==='holdout'&&!args.freeze)throw Error('Holdout remains sealed without --freeze.');
 return args;
}
const publicPath=(path:string)=>relative(project,path).split(sep).join('/');
const readJson=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const errorObject=(error:any)=>({name:error?.name||'Error',message:error?.message||String(error),status:error?.status??null,audit:error?.audit??null});

async function modelIdentity(ai:any,supportedModel:string){
 const status=await ai.modelStatus();
 if(!status.online)throw Error('Ollama is unavailable; model identities cannot be established.');
 const identities=await identifyTaggedModels({generation:ai.MODEL,supportedGeneration:supportedModel,embedding:ai.EMBED},status.models,async name=>{
  const response=await fetch(ai.OLLAMA+'/api/show',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:name}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(`Cannot read tag defaults and capabilities for ${name}: Ollama HTTP ${response.status}.`);
  return response.json();
 });
 const after=await ai.modelStatus();
 for(const model of Object.values(identities))if(!after.online||after.models?.find((tag:any)=>tag.name===model.name)?.digest!==model.digest)throw Error(`Model tag changed while reading metadata: ${model.name}. Restart with stable tags.`);
 const response=await fetch(ai.OLLAMA+'/api/version',{signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('Cannot identify the running Ollama version.');
 const version=await response.json() as {version?:string};if(!version.version)throw Error('Ollama returned no version.');
 return{...identities,ollamaVersion:version.version};
}

/** Observe this process's model calls without changing the pipeline's response. */
function captureModelResponses(){
 const original=globalThis.fetch;
 const calls:any[]=[];
 const pending:Promise<unknown>[]=[];
 globalThis.fetch=async function(input,init){
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  const watched=url==='http://127.0.0.1:11434/api/chat';
  if(!watched)return original(input,init);
  const started=performance.now(),record:any={endpoint:'/api/chat',startedAt:new Date().toISOString(),request:null};
  if(typeof init?.body==='string'){try{record.request=JSON.parse(init.body)}catch{record.requestText=init.body}}
  calls.push(record);
  try{
   const response=await original(input,init);record.status=response.status;
   const capture=response.clone().text().then(text=>{record.responseText=text;try{record.response=JSON.parse(text)}catch{record.responseJsonValid=false}}).catch(error=>{record.bodyReadError=errorObject(error)}).finally(()=>{record.elapsedMs=Math.round(performance.now()-started)});
   pending.push(capture);return response;
  }catch(error){record.error=errorObject(error);record.elapsedMs=Math.round(performance.now()-started);throw error;}
 };
 return{calls,async finish(){globalThis.fetch=original;let timer:ReturnType<typeof setTimeout>|undefined;await Promise.race([Promise.allSettled(pending),new Promise<void>(resolve=>{timer=setTimeout(()=>{for(const call of calls)if(call.elapsedMs===undefined)call.captureIncomplete=true;resolve()},3000)})]);if(timer)clearTimeout(timer);}};
}

function summarize(rows:any[]){
 const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return null;const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2};
 return{at:new Date().toISOString(),scope:'Structural and delivery diagnostics only; semantic scoring must follow the frozen scoring protocol.',semanticScoresProduced:false,
  modes:Object.fromEntries((['frozen-grounded','supported'] as Mode[]).map(mode=>{const subset=rows.filter(row=>row.mode===mode);return[mode,{attempted:subset.length,returned:subset.filter(row=>row.ok).length,errors:subset.filter(row=>!row.ok).length,supportedResponses:subset.filter(row=>row.ok&&row.diagnostics?.deliveredAnswer).length,insufficientResponses:subset.filter(row=>row.ok&&row.diagnostics?.deliveredRefusal).length,unverifiedResponses:subset.filter(row=>row.ok&&row.diagnostics?.unverified).length,medianWallMs:median(subset.map(row=>row.wallMs))}]})),
  notes:['Required facts and forbidden claims are not substring-graded.','A refusal marker or a matching quotation is not a semantic correctness score.','Unverified responses and errors are no-answer outcomes, not correct refusals.','Initial request timing is not a cold-start measurement; no model unload/restart is performed.']};
}

async function main(){
 const args=parseArgs(process.argv.slice(2));if(args.help){console.log(HELP);return;}
 const lockPath=args.lock!,lock=readJson(lockPath) as DatasetLock;
 if(lock.schemaVersion!==1||!Array.isArray(lock.files))throw Error('Unsupported dataset lock.');
 // No store-owning module is imported before this private evaluation location is set.
 const isolation=resolve(project,'.local/evaluate-v13',args.out?objectHash(publicPath(args.out)):'describe-'+randomUUID());
 mkdirSync(isolation,{recursive:true});process.env.TRACELEARN_DATA=isolation;
 const graphs=()=>({runner:sourceGraph(project,'scripts/evaluate-v13.ts',['scripts/evaluate-v13-core.ts','package-lock.json']),pipelines:{'frozen-grounded':sourceGraph(project,'server/ai.ts',['package-lock.json']),supported:sourceGraph(project,'server/support-answer.ts',['package-lock.json'])}});
 const importedSources=graphs();
 const ai=await import('../server/ai.ts');
 const runtime=await import(pathToFileURL(resolve(project,'server/support-answer.ts')).href);
 if(canonicalJson(graphs())!==canonicalJson(importedSources))throw Error('Source changed while importing the candidate. Restart with a stable configuration; no cases were read.');
 if(typeof runtime.supportedAnswer!=='function'||(!runtime.SUPPORT_CONFIG&&!runtime.SUPPORT_OPTIONS))throw Error('New runtime must export supportedAnswer and SUPPORT_CONFIG or SUPPORT_OPTIONS.');
 if(typeof runtime.SUPPORT_MODEL!=='string'||!runtime.SUPPORT_MODEL.trim())throw Error('New runtime must export its actual SUPPORT_MODEL name.');
 const supportConfig=runtime.SUPPORT_CONFIG??{think:runtime.SUPPORT_THINK,options:runtime.SUPPORT_OPTIONS};
 if(!runtime.SUPPORT_CONFIG&&typeof runtime.SUPPORT_THINK!=='boolean')throw Error('The new runtime must expose its thinking setting; do not infer it from baseline options.');
 const baselinePrefix=(text:string)=>text.split('export const generatedSchema=')[0];
 const frozenBaseline=fileHash(resolve(project,'evaluation/answer-pipeline-v3.ts.txt'));
 if(objectHash(baselinePrefix(readFileSync(resolve(project,'server/ai.ts'),'utf8')))!==objectHash(baselinePrefix(readFileSync(resolve(project,'evaluation/answer-pipeline-v3.ts.txt'),'utf8'))))throw Error('The historical answer pipeline differs from its frozen v1.0 snapshot.');
 const identity:FrozenIdentity={schemaVersion:1,datasetLockSha256:fileHash(lockPath),runnerSha256:importedSources.runner.hash,
  pipelines:importedSources.pipelines,
  model:await modelIdentity(ai,runtime.SUPPORT_MODEL),options:{'frozen-grounded':{model:ai.MODEL,think:false,options:ai.options},supported:{...supportConfig,model:runtime.SUPPORT_MODEL}},deadlineMs:args.deadlineMs,
  scoringProtocols:Object.fromEntries(args.protocols.map(path=>[publicPath(path),fileHash(path)]).sort(([a],[b])=>a.localeCompare(b)))};
 if(args.describe){console.log(JSON.stringify({identity,freezeTemplate:{...identity,state:'UNFROZEN',frozenAt:null,authorization:'NOT AUTHORIZED'},notes:['No case files were opened and no inference was run.','A root-reviewed freeze must set state=frozen, a real frozenAt, and authorization=one-shot holdout requested by root.']},null,2));return;}
 const freeze=args.freeze?readJson(args.freeze):undefined;
 // Deliberately comes BEFORE readLockedJson(cases), even if the file is a symlink.
 gateCaseRead(args.split!,args.cases!,freeze,identity);
 const docInput=readLockedJson<SourceDocument[]>(args.documents!,lockPath,lock);
 const caseInput=readLockedJson<EvaluationCase[]>(args.cases!,lockPath,lock);
 validateDataset(docInput.value,caseInput.value,args.split!,lock);
 const docs=new Map(docInput.value.map(document=>[document.id,document]));
 const config={...identity,split:args.split,documentsFileSha256:docInput.sha256,casesFileSha256:caseInput.sha256,modes:[...args.modes].sort(),frozenBaselineSnapshotSha256:frozenBaseline,freezeSha256:args.freeze?fileHash(args.freeze):null,
  execution:'Sequential input case order; pipeline order alternates by original case index. Source vectors cache separately for each mode/document. Errors are not silently rerun.',node:process.version,platform:process.platform,architecture:process.arch};
 const configurationHash=objectHash(config),out=args.out!;
 if(out===project||out===dirname(args.documents!)||out===resolve(project,'evaluation')||out.startsWith(resolve(project,'evaluation')+sep))throw Error('Choose a separate v1.3 results directory; original evaluation and dataset roots are protected.');
 const manifestPath=resolve(out,'manifest.json'),resultsPath=resolve(out,'raw-results.jsonl');
 const old=existsSync(manifestPath)?readJson(manifestPath):undefined;
 validateResumeConfiguration(old,config);
 if(!old&&existsSync(resultsPath))throw Error('Results have no matching manifest; do not append to an unverified run.');
 const rows:any[]=existsSync(resultsPath)?readFileSync(resultsPath,'utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
 const expected=new Map<string,{item:EvaluationCase;mode:Mode}>();
 for(const item of caseInput.value)for(const mode of args.modes)expected.set(resumeKey(item,mode,identity.pipelines[mode].hash,item.documentHash),{item,mode});
 const done=new Set<string>();
 for(const row of rows){const match=expected.get(row.key);if(!match||done.has(row.key)||row.configurationHash!==configurationHash||row.caseHash!==objectHash(match.item)||row.caseId!==match.item.id||row.split!==match.item.split||row.mode!==match.mode||row.pipelineHash!==identity.pipelines[match.mode].hash||row.materialHash!==match.item.documentHash||typeof row.ok!=='boolean'||!Number.isFinite(row.wallMs)||row.wallMs<0||(row.ok?!row.output||!row.diagnostics:!row.error))throw Error('Existing result identity differs, is duplicated, or is incomplete; refusing unsafe resume.');done.add(row.key);}
 const requested=args.caseIds.length?new Set(args.caseIds):null;
 if(requested&&args.caseIds.some(id=>!caseInput.value.some(item=>item.id===id)))throw Error('Unknown requested development case ID.');
 const selected=caseInput.value.map((item,index)=>({item,index})).filter(({item})=>!requested||requested.has(item.id)).slice(0,args.limit);
 if(args.validateOnly){console.log(JSON.stringify({validated:true,split:args.split,cases:selected.length,alreadyRecorded:done.size,configurationHash,identity},null,2));return;}
 mkdirSync(out,{recursive:true});
 if(!old){
  const graph={...identity.pipelines['frozen-grounded'].files,...identity.pipelines.supported.files,...importedSources.runner.files};
  for(const [name,hash] of Object.entries(graph)){const bytes=readFileSync(resolve(project,name));if(fileHash(resolve(project,name))!==hash)throw Error('Source changed while snapshotting. Use a new output directory.');const target=resolve(out,'source-snapshot',name);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);}
  writeFileSync(manifestPath,JSON.stringify({createdAt:new Date().toISOString(),configurationHash,configuration:config,scope:'Versioned development/one-shot holdout runtime comparison; no semantic correctness is inferred automatically.'},null,2));
 }
 const abort=new AbortController();const stop=()=>abort.abort(new Error('Evaluation interrupted'));
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
 const courseCache=new Map<string,Course>();
 try{
  for(const {item,index} of selected){
   const order=index%2?[...args.modes].reverse():args.modes;
   for(const mode of order){
    const key=resumeKey(item,mode,identity.pipelines[mode].hash,item.documentHash);if(done.has(key))continue;
    abort.signal.throwIfAborted();
    if(sourceGraph(project,mode==='supported'?'server/support-answer.ts':'server/ai.ts',['package-lock.json']).hash!==identity.pipelines[mode].hash)throw Error('Pipeline source changed during evaluation. Completed results were retained; remaining cases were not attempted.');
    const doc=docs.get(item.documentId)!,cacheKey=mode+':'+doc.id;let course=courseCache.get(cacheKey);
    if(!course){course={id:`v13-${mode}-${doc.id}`,title:doc.title,subtitle:'Original fictional evaluation source',builtin:false,hash:doc.hash,createdAt:'2026-09-15T00:00:00.000Z',sections:doc.sections.map(section=>({...section}))};courseCache.set(cacheKey,course);}
    const deadline=AbortSignal.timeout(args.deadlineMs),signal=AbortSignal.any([abort.signal,deadline]);
    const capture=captureModelResponses(),started=performance.now(),startedAt=new Date().toISOString();let output:any,error:any;
    try{output=mode==='frozen-grounded'?await ai.answer(course,item.question,item.language,'grounded',signal):await runtime.supportedAnswer(course,item.question,item.language,signal);}
    catch(cause){error=errorObject(cause);if(deadline.aborted)error.runnerDeadlineExceeded=true;if(abort.signal.aborted)error.runnerInterrupted=true;}
    const wallMs=Math.round(performance.now()-started);await capture.finish();
    const diagnostics=error?undefined:outputDiagnostics(item,output);
    const row={key,caseId:item.id,caseHash:objectHash(item),split:item.split,mode,pipelineHash:identity.pipelines[mode].hash,materialHash:item.documentHash,configurationHash,category:item.category,language:item.language,documentId:item.documentId,caseIndex:index,pipelinePosition:order.indexOf(mode),startedAt,wallMs,ok:!error,case:item,...(error?{error}:{output,diagnostics}),modelHttpCalls:capture.calls};
    appendFileSync(resultsPath,JSON.stringify(row)+'\n');rows.push(row);done.add(key);
    writeFileSync(resolve(out,'diagnostic-summary.json'),JSON.stringify(summarize(rows),null,2));
    console.log(`${item.id} ${mode}: ${error?'error':diagnostics?.outcome} ${(wallMs/1000).toFixed(2)}s`);
    if(abort.signal.aborted)throw Error('Evaluation interrupted. The current attempt and its raw outputs were retained; exact remaining keys can resume.');
   }
  }
 }finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
 console.log(JSON.stringify({finished:true,configurationHash,recorded:rows.length,expected:expected.size,complete:done.size===expected.size},null,2));
}

main().catch(error=>{console.error(error?.message||String(error));process.exitCode=1;});
