import {appendFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {answer,modelStatus,options} from '../server/ai.ts';
import {getCourse,hash} from '../server/store.ts';
const dataset=JSON.parse(readFileSync('evaluation/dataset.json','utf8')) as any[];
const lock=JSON.parse(readFileSync('evaluation/dataset-lock.json','utf8'));
if(hash(readFileSync('evaluation/dataset.json'))!==lock.sha256)throw Error('Dataset differs from frozen hash');
const path='evaluation/raw-results.jsonl';
const done=new Set(existsSync(path)?readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(s=>{const r=JSON.parse(s);return r.id+':'+r.mode}):[]);
const prefixHash=hash(readFileSync('server/ai.ts','utf8').split('export const generatedSchema=')[0]);
if(done.size){
 const recorded=JSON.parse(readFileSync('evaluation/model-manifest.json','utf8'));
 const frozenPrefix=hash(readFileSync('evaluation/answer-pipeline-v3.ts.txt','utf8').split('export const generatedSchema=')[0]);
 if(recorded.promptVersion!=='v3'||recorded.datasetSha256!==lock.sha256||prefixHash!==frozenPrefix)throw Error('Archive the existing results before evaluating a changed answer pipeline.');
}else writeFileSync('evaluation/model-manifest.json',JSON.stringify({at:new Date().toISOString(),status:await modelStatus(),ollama:await(await fetch('http://127.0.0.1:11434/api/version')).json(),options,node:process.version,datasetSha256:lock.sha256,aiSourceSha256:hash(readFileSync('server/ai.ts')),answerPipelinePrefixSha256:prefixHash,promptVersion:'v3'},null,2));
const filter=process.env.EVAL_SPLIT;
for(const item of dataset.filter(x=>!filter||x.split===filter)){for(const mode of ['baseline','grounded'] as const){if(done.has(item.id+':'+mode))continue;const start=performance.now();let r:any;try{const out=await answer(getCourse('database-foundations')!,item.prompt,'en',mode);const letter=out.answer.match(/^(?:\*\*)?([A-D])(?:\*\*)?(?:[.\s:)]|$)/)?.[1]||out.answer.match(/(?:correct (?:answer|option) (?:is )?[:\s]*)([A-D])\b/i)?.[1];r={id:item.id,split:item.split,category:item.category,ok:true,...out,elapsedMs:Math.round(performance.now()-start),citationLocationValid:out.citations.length>0||out.insufficient,expectedSourceHit:out.citations.some(c=>item.sourceIds.includes(c.sectionId)),keywordCheck:item.keywords.every((k:string)=>out.answer.toLowerCase().includes(k.toLowerCase())),quizCorrect:item.category==='quiz'?letter===item.correctLetter:null,extractedLetter:letter||null};}catch(e){r={id:item.id,split:item.split,category:item.category,mode,ok:false,elapsedMs:Math.round(performance.now()-start),error:String(e)}}appendFileSync(path,JSON.stringify(r)+'\n');console.log(`${item.id} ${item.split} ${mode}: ${r.ok?(r.insufficient?'refused':'answered'):'failed'} ${(r.elapsedMs/1000).toFixed(1)}s`);}}
const results=readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));
const median=(a:number[])=>{a.sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null};
const summary:any={generatedAt:new Date().toISOString(),notes:['Keyword overlap is not semantic answer accuracy.','Expected source hit measures location overlap, not entailment.','Question validity and entailment need separate review.','No learning outcome was measured.']};
for(const split of ['development','holdout','all']){summary[split]={};for(const mode of ['baseline','grounded']){const rows=results.filter(r=>r.mode===mode&&(split==='all'||r.split===split));const a=rows.filter(r=>r.category==='answerable'),u=rows.filter(r=>r.category==='unanswerable'),q=rows.filter(r=>r.category==='quiz');summary[split][mode]={runs:rows.length,success:rows.filter(r=>r.ok).length,answerableAnswered:a.filter(r=>r.ok&&!r.insufficient).length,answerableTotal:a.length,unanswerableRefused:u.filter(r=>r.ok&&r.insufficient).length,unanswerableTotal:u.length,quizCorrect:q.filter(r=>r.quizCorrect).length,quizTotal:q.length,expectedSourceHit:a.filter(r=>r.expectedSourceHit).length,keywordCheckPass:a.filter(r=>r.keywordCheck).length,medianMs:median(rows.map(r=>r.elapsedMs))};}}
writeFileSync('evaluation/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
