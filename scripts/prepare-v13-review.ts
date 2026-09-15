import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import type {CurrentEvidenceData,CurrentEvidenceRecord} from '../src/CurrentEvidence.tsx';

// Display projection only. Saved semantic judgments are authenticated, never rescored.
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const manifest=JSON.parse(readFileSync('evidence/v1.3/final-manifest.json','utf8'));
if(manifest.version!=='1.3.0')throw Error('Expected the finalized v1.3.0 evidence manifest.');
const records:CurrentEvidenceRecord[]=[],rawHashes:string[]=[];
function sourceSnapshot(row:any){
 if(Array.isArray(row.output?.sources))return row.output.sources;
 const inputs=[];
 for(const call of row.modelHttpCalls??[]){
  if(call.endpoint!=='/api/chat')continue;
  const text=call.request?.messages?.find((message:any)=>message.role==='user')?.content;
  if(typeof text!=='string')continue;
  try{inputs.push(JSON.parse(text));}catch{/* A retry may append validation guidance. */}
 }
 const withSources=inputs.find(input=>Array.isArray(input.sources));
 if(withSources)return withSources.sources.map((source:any)=>({id:source.id??source.sectionId,title:source.title,text:source.text}));
 const withEvidence=inputs.find(input=>Array.isArray(input.evidence));
 if(withEvidence)return withEvidence.evidence.map((source:any)=>({id:source.id,title:`${source.sectionId} / submitted excerpt ${source.id}`,text:source.quote}));
 return [];
}
for(const split of ['development','holdout'] as const){
 const spec=manifest[split],directory=resolve(spec.directory);
 if(!directory.startsWith(resolve('evidence/v1.3')+'/'))throw Error('Final run must be inside evidence/v1.3.');
 const raw=readFileSync(directory+'/raw-results.jsonl'),reviewBytes=readFileSync(directory+'/semantic-review.json');
 if(sha(raw)!==spec.rawSha256||sha(reviewBytes)!==spec.semanticReviewSha256)throw Error('Final evidence file hash changed.');
 const runManifest=JSON.parse(readFileSync(directory+'/manifest.json','utf8'));
 const review=JSON.parse(reviewBytes.toString('utf8'));
 const lines=raw.toString('utf8').split('\n').map(line=>line.replace(/\r$/,'')).filter(Boolean);
 if(lines.length!==80||review.entries.length!==80||review.independentHumanReview!==false)throw Error('Need 80 complete, explicitly disclosed records per split.');
 const keys=new Set<string>();
 for(const line of lines){
  const row=JSON.parse(line),key=row.caseId+'|'+row.mode;
  if(row.split!==split||row.case.split!==split||keys.has(key)||!['frozen-grounded','supported'].includes(row.mode))throw Error('Duplicate, invalid or mismatched case record.');
  keys.add(key);
  const scored=review.entries.filter((entry:any)=>entry.caseId===row.caseId&&entry.variant===row.mode);
  if(scored.length!==1)throw Error('Expected exactly one saved semantic judgment per raw row.');
  const entry=scored[0];
  if(entry.rawOutputSha256!==sha(line)||['key','pipelineHash','materialHash','configurationHash'].some(field=>entry.runIdentity[field]!==row[field]))throw Error('Saved judgment does not identify this exact raw output.');
  if(typeof entry.taskCorrect!=='boolean'||!Array.isArray(entry.failureFlags)||typeof entry.rationale!=='string')throw Error('Saved semantic judgment is incomplete.');
  const output=row.output;
  const snapshot=sourceSnapshot(row);
  const model=row.mode==='supported'?runManifest.configuration.model.supportedGeneration.name:runManifest.configuration.model.generation.name;
  records.push({id:row.caseId,split,category:row.category,question:row.case.question,reference:row.case.reference,expectedInsufficient:row.case.expectedInsufficient,mode:row.mode,model:output?.model??model,answer:output?.answer,error:row.error?.message,wallMs:row.wallMs,outcome:row.diagnostics?.outcome??'error',claims:output?.support?.claims??[],citations:output?.citations??[],sources:snapshot.map(({id,title,text}:any)=>({id,title,text})),review:{taskCorrect:entry.taskCorrect,evidenceValid:entry.evidenceValid,rationale:entry.rationale,failureFlags:entry.failureFlags}});
 }
 const ids=new Set(records.filter(row=>row.split===split).map(row=>row.id));
 if(ids.size!==40||[...ids].some(id=>!keys.has(id+'|frozen-grounded')||!keys.has(id+'|supported')))throw Error('Need every paired case in the complete split.');
 rawHashes.push(split+': '+sha(raw));
}
const data:CurrentEvidenceData={provenance:'Version 1.3 complete recorded comparison. Both methods use the same four fictional source documents and hybrid retriever; model and answer configurations differ. Development was examined during implementation; holdout was opened only after a recorded configuration freeze. Dataset author and Codex-assisted semantic reviewer are the same process. No independent human or classroom study was conducted. This projection authenticates saved raw-line hashes and judgments; it does not rerun models or rescore outputs.',rawHashes,records};
mkdirSync('src/generated',{recursive:true});writeFileSync('src/generated/current-evidence.json',JSON.stringify(data));
console.log(`Prepared ${records.length} authenticated current records from 80 cases.`);
