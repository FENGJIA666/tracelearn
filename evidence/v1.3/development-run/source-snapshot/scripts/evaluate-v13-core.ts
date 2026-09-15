import {createHash} from 'node:crypto';
import {existsSync,readFileSync,realpathSync,statSync} from 'node:fs';
import {dirname,extname,relative,resolve,sep} from 'node:path';

export type Mode='frozen-grounded'|'supported';
export type Split='development'|'holdout';
export type SourceDocument={id:string;title:string;fictional:true;sections:{id:string;title:string;text:string;page:number}[];hash:string};
export type EvaluationCase={id:string;split:Split;documentId:string;documentHash:string;category:'source-answerable'|'unanswerable'|'contradicted-premise';language:'en'|'zh';tags:string[];question:string;reference:string;supportIds:string[];requiredFacts:string[];forbiddenClaims:string[];expectedInsufficient:boolean};
export type SourceGraph={hash:string;files:Record<string,string>};
export type ModelIdentity={generation:{name:string;digest:string};embedding:{name:string;digest:string};ollamaVersion:string};
export type FrozenIdentity={schemaVersion:1;datasetLockSha256:string;runnerSha256:string;pipelines:Record<Mode,SourceGraph>;model:ModelIdentity;options:Record<Mode,unknown>;deadlineMs:number;scoringProtocols:Record<string,string>};
export type Freeze=FrozenIdentity&{state:'frozen';frozenAt:string;authorization:'one-shot holdout requested by root'};
export type DatasetLock={schemaVersion:number;files:{path:string;sha256:string;bytes:number}[];counts:Record<Split,{count:number}>;documents:{id:string;hash:string;sections:number}[]};

export function canonicalJson(value:unknown):string{
 const ordered=(v:any):any=>Array.isArray(v)?v.map(ordered):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(key=>[key,ordered(v[key])])):v;
 return JSON.stringify(ordered(value));
}
export const sha256=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
export const fileHash=(path:string)=>sha256(readFileSync(path));
export const objectHash=(value:unknown)=>sha256(canonicalJson(value));

/** Includes relative runtime imports so a changed helper cannot reuse old runs. */
export function sourceGraph(project:string,entry:string,extra:string[]=[]):SourceGraph{
 project=realpathSync(project);
 const files:Record<string,string>={};
 function visit(input:string){
  const path=realpathSync(input),name=relative(project,path).split(sep).join('/');
  if(name.startsWith('../')||name==='..')throw Error('Fingerprint sources must stay inside the project.');
  if(files[name])return;
  const bytes=readFileSync(path);files[name]=sha256(bytes);
  if(!['.ts','.tsx','.js','.mjs','.cjs'].includes(extname(path)))return;
  const text=bytes.toString('utf8');
  for(const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)){
   const target=resolve(dirname(path),match[1]);
   const candidates=extname(target)?[target]:[target,...['.ts','.tsx','.mjs','.js','.json','/index.ts','/index.tsx'].map(suffix=>target+suffix)];
   const found=candidates.find(candidate=>existsSync(candidate)&&statSync(candidate).isFile());
   if(!found)throw Error(`Cannot resolve fingerprint dependency ${match[1]} in ${name}.`);
   visit(found);
  }
 }
 visit(resolve(project,entry));for(const path of extra)visit(resolve(project,path));
 return{hash:objectHash(files),files:Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)))};
}

export function validateFreeze(value:unknown,current:FrozenIdentity):asserts value is Freeze{
 const freeze=value as Partial<Freeze>;
 if(!freeze||freeze.schemaVersion!==1||freeze.state!=='frozen'||freeze.authorization!=='one-shot holdout requested by root'||typeof freeze.frozenAt!=='string'||!Number.isFinite(Date.parse(freeze.frozenAt)))throw Error('Holdout is sealed: supply an explicitly authorized, completed freeze.json first.');
 for(const key of ['datasetLockSha256','runnerSha256','pipelines','model','options','deadlineMs','scoringProtocols'] as const){
  if(canonicalJson(freeze[key])!==canonicalJson(current[key]))throw Error(`Frozen ${key} differs from the current candidate/configuration. Holdout remains unread.`);
 }
}

/** Gate execution before the caller opens a case file, including a misleading CLI split. */
export function gateCaseRead(split:Split,path:string,freeze:unknown,current:FrozenIdentity):void{
 if(split==='holdout')validateFreeze(freeze,current);
 else if([path,realpathSync(path)].some(value=>/(?:holdout|sealed)/i.test(value)))throw Error('A development run cannot open a sealed/holdout case path, including a symlink target.');
}

export function readLockedJson<T>(path:string,lockPath:string,lock:DatasetLock):{value:T;sha256:string}{
 const relativePath=relative(dirname(lockPath),path).split(sep).join('/');
 const entry=lock.files.find(file=>file.path===relativePath);
 if(!entry)throw Error(`Input is not listed in the dataset lock: ${relativePath}`);
 const bytes=readFileSync(path),actual=sha256(bytes);
 if(actual!==entry.sha256||bytes.length!==entry.bytes)throw Error(`Locked input changed: ${relativePath}`);
 return{value:JSON.parse(bytes.toString('utf8')) as T,sha256:actual};
}

export function validateDataset(documents:SourceDocument[],cases:EvaluationCase[],split:Split,lock:DatasetLock):void{
 if(!Array.isArray(documents)||!Array.isArray(cases))throw Error('Documents and cases must be JSON arrays.');
 const documentsById=new Map<string,SourceDocument>();
 for(const document of documents){
  const {hash,...content}=document;
  if(typeof document.id!=='string'||!document.id||documentsById.has(document.id)||document.fictional!==true||!Array.isArray(document.sections)||objectHash(content)!==hash)throw Error('Invalid, duplicate, or changed document.');
  const locked=lock.documents.find(d=>d.id===document.id);
  if(!locked||locked.hash!==hash||locked.sections!==document.sections.length)throw Error(`Document differs from lock: ${document.id}`);
  const ids=new Set<string>();
  for(const section of document.sections){if(typeof section.id!=='string'||ids.has(section.id)||typeof section.text!=='string'||!section.text||typeof section.title!=='string'||!Number.isInteger(section.page))throw Error(`Invalid section in ${document.id}`);ids.add(section.id);}
  documentsById.set(document.id,document);
 }
 if(cases.length!==lock.counts[split]?.count)throw Error(`Unexpected ${split} case count.`);
 const ids=new Set<string>();
 for(const item of cases){
  const document=documentsById.get(item.documentId);
  if(typeof item.id!=='string'||ids.has(item.id)||item.split!==split||!document||item.documentHash!==document.hash||!['en','zh'].includes(item.language)||!['source-answerable','unanswerable','contradicted-premise'].includes(item.category)||typeof item.question!=='string'||!item.question.trim()||typeof item.reference!=='string'||!item.reference.trim())throw Error('Invalid case identity, split, language, or document mapping.');
  for(const name of ['tags','supportIds','requiredFacts','forbiddenClaims'] as const)if(!Array.isArray(item[name])||item[name].some(value=>typeof value!=='string'))throw Error(`Invalid ${name} for ${item.id}`);
  if(item.supportIds.some(id=>!document.sections.some(s=>s.id===id))||item.expectedInsufficient!==(item.category==='unanswerable'))throw Error(`Invalid expected support contract for ${item.id}`);
  ids.add(item.id);
 }
}

export function resumeKey(item:EvaluationCase,mode:Mode,pipelineHash:string,materialHash:string):string{
 return objectHash({caseId:item.id,caseHash:objectHash(item),mode,pipelineHash,materialHash});
}

export function outputDiagnostics(item:EvaluationCase,output:any){
 const outcome=output?.support?.outcome??(output?.insufficient?'insufficient':'supported');
 const citations=Array.isArray(output?.citations)?output.citations:[];
 const sources=Array.isArray(output?.sources)?output.sources:[];
 const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
 const quoteChecks=citations.map((citation:any)=>({sectionId:citation.sectionId,exact:typeof citation.quote==='string'&&sources.some((source:any)=>source.id===citation.sectionId&&typeof source.text==='string'&&normalize(source.text).includes(normalize(citation.quote)))}));
 return{semanticCorrectness:null,semanticReviewRequired:true,outcome,deliveredAnswer:outcome==='supported',deliveredRefusal:outcome==='insufficient',unverified:outcome==='unverified',insufficientMarker:output?.insufficient===true,
  expectedRefusalMarkerMatches:outcome==='unverified'?null:(outcome==='insufficient')===item.expectedInsufficient,
  exactQuoteChecks:quoteChecks,expectedSourceIdIntersection:citations.filter((c:any)=>item.supportIds.includes(c.sectionId)).map((c:any)=>c.sectionId),
  note:'These are diagnostic flags only. Exact quotations, source-ID overlap, and refusal-marker agreement do not establish semantic correctness. Required/forbidden propositions are not substring-scored.'};
}
