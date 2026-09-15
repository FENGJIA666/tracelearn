/** Real model boundary probes, once each; no server or model process is started.
 * npx tsx scripts/context-check-v13.ts --out evidence/v1.3/context-check.json
 * Imports production modules only after selecting a new isolated data directory.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {Course,Section} from '../content/course.ts';

type Data=Record<string,any>;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const usage='Usage: npx tsx scripts/context-check-v13.ts --out <new-result.json>';
const sha256=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const normalize=(value:string)=>value.replace(/\s+/gu,' ').trim();
const errorRecord=(error:unknown)=>({name:error instanceof Error?error.name:'Error',message:error instanceof Error?error.message:String(error),...((typeof error==='object'&&error)?{status:(error as Data).status??null,audit:(error as Data).audit??null}:{})});
const pipelineFiles=['server/support-answer.ts','server/local-model.ts','server/evidence-quotes.ts','server/ai.ts'];
const pipelineHashes=()=>Object.fromEntries(pipelineFiles.map(path=>[path,sha256(readFileSync(resolve(root,path)))]));

// Original fictional note-keeping material. Only the first and final passages
// contain review codes. They are absent from the question and middle passages.
function material():Section[]{
 const filler=[
  '这份原创练习材料描述一个虚构的学习笔记工作坊。每张摘录卡片保留原编号和出处，方便后来的人回到原段落检查文字。',
  '整理员先阅读整页内容，再把需要讨论的句子写入观察表。观察表把原话和读者自己的解释分开，修改解释时仍保留原话。',
  '复核员按照页序查看卡片，并记录哪些词语尚未说明。如果某页没有提供所需信息，观察表标记缺少材料，不代替作者补写结论。',
  '小组讨论使用相同的摘录顺序。每个人可以给出不同的理解，但最后需要说明哪一句原话支持自己的说法，以及问题还有哪些部分没有回答。',
  '这里的页码、工作坊和卡片流程均为合成示例，只用于检查长文本传递是否完整。材料不包含真实学生、考试记录、联系方式或外部链接。'
 ].join('');
 return Array.from({length:5},(_,index)=>{
  const prefix=index===0?'第一页开头的审查码是 NOVA-Q7。':'这是第'+['一','二','三','四','五'][index]+'页的原创笔记内容。';
  const suffix=index===4?'。第五页末尾的审查码是 MAPLE-T9。':'。本页记录到此结束。';
  const text=prefix+filler.repeat(5).slice(0,1400-prefix.length-suffix.length)+suffix;
  assert.equal(text.length,1400);
  return {id:`context-p${index+1}`,title:`原创长文本第${index+1}页`,page:index+1,text};
 });
}

async function main(outPath:string){
 const dataDirectory=resolve(root,'.local/v13-context-check');
 if(existsSync(outPath))throw Error('Output exists; refusing to overwrite or rerun this evidence.');
 if(existsSync(dataDirectory))throw Error('The isolated context-check directory already exists; this script does not resume or repeat generation.');
 const sections=material(),question='请按“第一页开头审查码；第五页末尾审查码”的顺序，给出材料中的两个审查码，并引用各自所在的原文。';
 const oversized='原始笔记内容需要完整保存，以便逐段检查上下文是否被静默丢弃。'.repeat(2000).slice(0,40_000);
 assert.equal(oversized.length,40_000);
 const out:Data={schemaVersion:1,startedAt:new Date().toISOString(),status:'running',scriptSHA256:sha256(readFileSync(fileURLToPath(import.meta.url))),
  scope:{realModel:true,retrieval:'Fixed five original passages injected into the production support-answer factory; retrieval and embedding quality are not tested.',budget:'One support request (production maximum four chat calls) and one oversized localChatRaw request. No probe is retried.',semanticReview:'Exact code inclusion and literal citations are checked deterministically; a separate Codex source review is required before interpreting the complete answer.',databaseDirectory:relative(root,dataDirectory),noServerStarted:true},
  inputs:{long:{question,sections,totalUTF16Characters:sections.reduce((sum,section)=>sum+section.text.length,0),sectionLengths:sections.map(section=>section.text.length),sectionsSHA256:sha256(JSON.stringify(sections)),questionSHA256:sha256(question),expectedCodes:[{sectionId:sections[0].id,code:'NOVA-Q7'},{sectionId:sections[4].id,code:'MAPLE-T9'}]},oversized:{text:oversized,UTF16Characters:oversized.length,SHA256:sha256(oversized)}},
  pipelineHashesBefore:pipelineHashes(),http:[] as Data[],checks:[] as Data[]};
 mkdirSync(dirname(outPath),{recursive:true});mkdirSync(dataDirectory,{recursive:true});
 writeFileSync(outPath,JSON.stringify(out,null,2)+'\n',{flag:'wx'});
 const save=()=>writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
 const progress=(message:string)=>process.stdout.write(message+'\n');
 const originalData=process.env.TRACELEARN_DATA;process.env.TRACELEARN_DATA=dataDirectory;
 const originalFetch=globalThis.fetch,captures:Promise<unknown>[]=[];
 let phase='preflight',longCalls=0,oversizedCalls=0;
 globalThis.fetch=async(input,init)=>{
  const url=input instanceof Request?input.url:String(input);
  assert.ok(url.startsWith('http://127.0.0.1:11434/'),'This probe may contact only the existing local Ollama service.');
  const body=typeof init?.body==='string'?init.body:undefined;
  if(url.endsWith('/api/chat')){
   if(phase==='long'){longCalls++;assert.ok(longCalls<=4,'Support probe exceeded four chat calls.');}
   else if(phase==='oversized'){oversizedCalls++;assert.equal(oversizedCalls,1,'Oversized probe cannot retry.');}
   else throw Error('Unexpected generation outside the two probes.');
  }
  const row:Data={index:out.http.length+1,phase,url,method:init?.method??'GET',startedAt:new Date().toISOString(),requestBody:body??null,requestSHA256:body?sha256(body):null};
  if(body){try{row.request=JSON.parse(body);}catch{}}
  out.http.push(row);save();const started=performance.now();
  try{
   const response=await originalFetch(input,init);row.status=response.status;row.contentType=response.headers.get('content-type');
   row.headersReceivedMs=Math.round(performance.now()-started);
   const capture=response.clone().text().then(raw=>{
    row.rawBody=raw;row.responseSHA256=sha256(raw);
    try{row.response=JSON.parse(raw);row.promptTokens=row.response.prompt_eval_count??null;row.outputTokens=row.response.eval_count??null;}catch{}
   }).catch(error=>{row.bodyReadError=errorRecord(error);}).finally(()=>{row.elapsedMs=Math.round(performance.now()-started);save();progress(`HTTP ${row.status} ${phase} ${new URL(url).pathname} (${row.elapsedMs} ms)`);});
   captures.push(capture);return response;
  }catch(error){row.error=errorRecord(error);row.elapsedMs=Math.round(performance.now()-started);save();throw error;}
 };
 async function check(name:string,task:()=>Promise<unknown>){
  const row:Data={name,status:'running',startedAt:new Date().toISOString()};out.checks.push(row);save();
  try{row.details=await task();row.status='passed';}catch(error){row.status='failed';row.error=errorRecord(error);}
  row.finishedAt=new Date().toISOString();save();progress(`${row.status}: ${name}`);return row.status==='passed';
 }
 let closeDatabase:(()=>void)|undefined;
 try{
  // The imports below can initialize SQLite; isolation is already in effect.
  const runtime=await import('../server/support-answer.ts');
  const local=await import('../server/local-model.ts');
  const {AppError}=await import('../server/ai.ts');
  const {db,dataDir}=await import('../server/store.ts');closeDatabase=()=>db.close();
  assert.equal(resolve(dataDir),dataDirectory);
  out.configuration={model:local.CURRENT_MODEL,embedding:local.EMBED,think:local.THINK,truncate:false,options:local.OPTIONS,policy:runtime.SUPPORT_POLICY,requestTimeoutMs:runtime.REQUEST_TIMEOUT_MS};
  out.configurationSHA256=sha256(JSON.stringify(out.configuration));save();
  const ready=await check('real-model-and-isolated-store-preflight',async()=>{
   const status=await local.modelStatus();out.modelStatus=status;assert.equal(status.online,true);assert.equal(status.ready,true);
   const version=await fetch('http://127.0.0.1:11434/api/version',{signal:AbortSignal.timeout(5000)});assert.equal(version.status,200);out.ollamaVersion=await version.json();
   assert.deepEqual(pipelineHashes(),out.pipelineHashesBefore);return {model:status.model,isolatedDataDirectory:relative(root,dataDirectory)};
  });
  if(!ready)return;
  phase='long';
  await check('long-chinese-source-retains-first-and-last-review-code',async()=>{
   const course:Course={id:'context-original-long',title:'原创中文上下文边界材料',subtitle:'Fixed-source model input probe',builtin:false,createdAt:'2026-09-16T00:00:00+08:00',hash:out.inputs.long.sectionsSHA256,sections};
   const answer=runtime.createSupportedAnswer({model:local.CURRENT_MODEL,retrieve:async()=>sections,chat:local.localChatRaw});
   const started=performance.now();
   try{out.longResult=await answer(course,question,'zh');}
   catch(error){out.longError=errorRecord(error);throw error;}
   finally{out.longElapsedMs=Math.round(performance.now()-started);await Promise.allSettled(captures);save();}
   const result=out.longResult;
   assert.equal(result.support.outcome,'supported','A complete answer did not pass the production checks.');
   assert.equal(result.model,local.CURRENT_MODEL);assert.equal(result.sources.length,5);
   assert.deepEqual(result.sources.map((section:Section)=>section.text),sections.map(section=>section.text));
   for(const {sectionId,code} of out.inputs.long.expectedCodes){
    assert.ok(result.answer.includes(code),`Delivered answer omitted ${code}.`);
    assert.ok(result.citations.some((citation:Data)=>citation.sectionId===sectionId&&citation.quote.includes(code)),`No citation establishes ${code} in its original passage.`);
   }
   for(const citation of result.citations){const section=sections.find(section=>section.id===citation.sectionId);assert.ok(section);assert.ok(normalize(section.text).includes(normalize(citation.quote)));}
   const calls=out.http.filter((row:Data)=>row.phase==='long'&&row.url.endsWith('/api/chat'));
   assert.ok(calls.length>=2&&calls.length<=4);
   for(const call of calls){assert.equal(call.request.truncate,false);assert.equal(call.request.options.num_ctx,local.OPTIONS.num_ctx);assert.equal(call.status,200);assert.ok(call.request.messages.some((message:Data)=>message.content.includes('NOVA-Q7')&&message.content.includes('MAPLE-T9')));}
   return {bothCodesIncluded:true,literalCitationsValid:true,sourcePassagesUnchanged:true,chatCalls:longCalls,promptTokens:calls.map((call:Data)=>call.promptTokens),elapsedMs:out.longElapsedMs,semanticCorrectness:null};
  });
  phase='oversized';
  await check('oversized-production-call-is-rejected-with-recoverable-400',async()=>{
   const started=performance.now();let failure:unknown;
   try{out.oversizedResult=await local.localChatRaw('Return only a JSON object with the key ok and the boolean value true.',oversized,{type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false});}
   catch(error){failure=error;out.oversizedError=errorRecord(error);}
   finally{out.oversizedElapsedMs=Math.round(performance.now()-started);await Promise.allSettled(captures);save();}
   const calls=out.http.filter((row:Data)=>row.phase==='oversized'&&row.url.endsWith('/api/chat'));
   assert.equal(calls.length,1);assert.equal(calls[0].request.truncate,false);assert.equal(calls[0].request.options.num_ctx,local.OPTIONS.num_ctx);
   assert.equal(calls[0].status,400,'Ollama must explicitly reject this oversized prompt.');
   assert.ok(failure instanceof AppError,'The adapter did not provide a recoverable AppError.');
   assert.equal(failure.status,400,'The actual context error was not mapped to a recoverable input error.');
   assert.match(failure.message,/Shorten the question or import a smaller source/);
   return {rawOllamaStatus:calls[0].status,applicationStatus:failure.status,message:failure.message,chatCalls:oversizedCalls,elapsedMs:out.oversizedElapsedMs};
  });
 }catch(error){out.fatalError=errorRecord(error);}
 finally{
  await Promise.allSettled(captures);globalThis.fetch=originalFetch;closeDatabase?.();
  if(originalData===undefined)delete process.env.TRACELEARN_DATA;else process.env.TRACELEARN_DATA=originalData;
  out.pipelineHashesAfter=pipelineHashes();out.pipelineUnchanged=JSON.stringify(out.pipelineHashesBefore)===JSON.stringify(out.pipelineHashesAfter);
  out.finishedAt=new Date().toISOString();out.summary={passed:out.checks.filter((check:Data)=>check.status==='passed').length,failed:out.checks.filter((check:Data)=>check.status==='failed').length,longChatCalls:longCalls,oversizedChatCalls:oversizedCalls};
  out.status=out.fatalError||out.summary.failed||!out.pipelineUnchanged?'failed':'passed';save();progress(JSON.stringify({status:out.status,...out.summary,output:outPath}));
  if(out.status!=='passed')process.exitCode=1;
 }
}

const args=process.argv.slice(2);
if(args.length===1&&args[0]==='--help')process.stdout.write(usage+'\n');
else if(args.length!==2||args[0]!=='--out'||!args[1]){process.stderr.write(usage+'\n');process.exitCode=1;}
else try{await main(resolve(args[1]));}catch(error){process.stderr.write((error instanceof Error?error.message:String(error))+'\n');process.exitCode=1;}
