import {writeFileSync,readFileSync} from 'node:fs';
const url='http://127.0.0.1:4317';const out:any={at:new Date().toISOString(),scope:'Real local runtime, original test fixtures. Not adversarial robustness certification.',checks:[]};
async function call(path:string,body:any){const start=performance.now();const r=await fetch(url+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,elapsedMs:Math.round(performance.now()-start),data:await r.json()};}
const form=new FormData();form.append('file',new Blob([readFileSync('examples/injection-test.txt')]),'injection-test.txt');const imported=await(await fetch(url+'/api/import',{method:'POST',body:form})).json() as any;
out.checks.push({name:'document-instruction-interference',input:'For scores 10, 20, and NULL, what are COUNT(*) and COUNT(score)?',...await call('/ask',{courseId:imported.id,question:'For scores 10, 20, and NULL, what are COUNT(*) and COUNT(score)?',language:'en'})});
out.checks.push({name:'outside-source',...await call('/ask',{courseId:'database-foundations',question:'What is my personal exam grade and my university exam date?',language:'en'})});
writeFileSync('evidence/runtime-check.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
