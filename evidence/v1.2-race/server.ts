import {createServer} from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import {resolve, extname, sep, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {questions, sections, type Course, type Question} from '../../content/course.ts';

// This fixture has no database, Ollama call, imported user files, or production
// endpoint. It serves the current real dist bundle against a clearly mocked API.
const port = 4340;
const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = resolve(project, 'dist');
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const courseA: Course = {id:'database-foundations',title:'Database foundations',subtitle:'Fixture course A',builtin:true,sections,hash:hash(sections),createdAt:'2026-09-15T00:00:00Z'};
const bSections = [{id:'fixture-b-source',title:'Course B verification passage',page:1,text:'This passage belongs exclusively to mocked course B. The verification code in course B is BETA. It must never display course A feedback.'}];
const courseB: Course = {id:'fixture-course-b',title:'FIXTURE course B',subtitle:'Mock data for navigation verification',builtin:false,sections:bSections,hash:hash(bSections),createdAt:'2026-09-15T00:00:00Z'};
const bQuestion: Question = {id:'fixture-b-d',courseId:courseB.id,concept:'FIXTURE B concept',kind:'generated',prompt:'FIXTURE B: Which verification code appears in course B?',options:['BETA','ALPHA','GAMMA','DELTA'],correct:0,explanation:'FIXTURE B explanation: BETA is the exact code in course B.',misconceptions:['','Course B says BETA.','Course B says BETA.','Course B says BETA.'],sourceIds:['fixture-b-source']};
const allQuestions = [...questions,bQuestion];
const courses = [courseA,courseB];
const history = new Map(courses.map(course => [course.id,{attempts:[] as any[],chats:[] as any[]}]));
type Mode = 'none'|'ask'|'grade'|'course-load'|'generation';
let mode: Mode = 'none';
const delayMs = 6500;
let events: any[] = [];
let sequence = 0;
function log(event: Record<string,unknown>) { events.push({sequence:++sequence,at:new Date().toISOString(),...event}); events=events.slice(-100); }
function publicQuestion(q: Question) { const {correct,explanation,misconceptions,sourceIds,...rest}=q; return rest; }
function publicState() {
  const index = existsSync(resolve(dist,'index.html')) ? readFileSync(resolve(dist,'index.html'),'utf8') : '';
  return {fixture:true,scope:'Mocked API and current local dist. No model inference and no production database.',mode,delayMs,dist:'<project>/dist',indexSha256:createHash('sha256').update(index).digest('hex'),events,history:Object.fromEntries(history)};
}
const controls = () => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TraceLearn request race fixture</title><style>body{max-width:900px;margin:32px auto;padding:16px;font:16px/1.5 system-ui;color:#182523}button,a{margin:6px;padding:10px 14px}pre{white-space:pre-wrap;background:#eef3f0;padding:16px}strong{color:#a14200}</style></head><body><h1>TraceLearn request race fixture</h1><p><strong>MOCKED API. No model inference, production database, or user study.</strong></p><p>Port 4340 serves the current compiled dist. Delay: 6.5 seconds; active mode: <b>${mode}</b>.</p><form method="post" action="/__fixture/mode">${(['none','ask','grade','course-load','generation'] as Mode[]).map(value=>`<button name="mode" value="${value}">Arm ${value}</button>`).join('')}</form><form method="post" action="/__fixture/reset"><button>Reset all mocked history and delays</button></form><p><a href="/">Open actual application UI</a><a href="/__fixture/seed-missing">Seed missing remembered course and open app</a><a href="/__fixture/clean-browser">Clear fixture browser preferences and open app</a><a href="/__fixture/state">Read machine-readable trace</a></p><h2>Verification path</h2><ol><li>Arm the requested delay, then open the actual application UI.</li><li>For Ask: ask in course A, then switch to FIXTURE course B before the response finishes. The B Ask screen should have no old answer or cancelled-request error.</li><li>For grading: answer any A question, immediately switch the course to B, then open Practice. B must show its BETA question without A feedback. Also try changing A questions while grading is pending.</li><li>For course-load: move A → B → A → B quickly. After 6.5 seconds, B questions, history and source must remain B.</li><li>For generation: select B, start generation, then switch to A before it finishes. A must not receive the B exercise or jump to it.</li><li>Use the missing-course link to seed only this fixture origin's storage. The application should recover to Database foundations and load 20 questions.</li></ol><h2>Current trace</h2><pre>${JSON.stringify(publicState(),null,2).replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre></body></html>`;

const server = createServer(async (req,res) => {
  const url = new URL(req.url || '/',`http://127.0.0.1:${port}`);
  const path = url.pathname;
  res.setHeader('X-TraceLearn-Fixture','mocked-api-no-model-no-production-data');
  res.setHeader('Cache-Control','no-store');
  const send = (status:number,value:unknown,type='application/json; charset=utf-8') => { if(res.destroyed)return; res.writeHead(status,{'Content-Type':type});res.end(type.startsWith('application/json')?JSON.stringify(value):value as string); };
  const redirect = (location:string) => {res.writeHead(303,{Location:location});res.end();};
  const raw = req.method==='POST' ? await new Promise<string>((resolve,reject)=>{let body='';req.on('data',chunk=>{body+=chunk;if(body.length>65536)req.destroy();});req.on('end',()=>resolve(body));req.on('error',reject);}) : '';
  if(path==='/__fixture' || path==='/__fixture/')return send(200,controls(),'text/html; charset=utf-8');
  if(path==='/__fixture/state')return send(200,publicState());
  if(path==='/__fixture/mode'&&req.method==='POST'){const chosen=new URLSearchParams(raw).get('mode') as Mode;if(['none','ask','grade','course-load','generation'].includes(chosen))mode=chosen;log({event:'mode-armed',mode});return redirect('/__fixture');}
  if(path==='/__fixture/reset'&&req.method==='POST'){mode='none';events=[];sequence=0;for(const h of history.values()){h.attempts=[];h.chats=[];}return redirect('/__fixture');}
  if(path==='/__fixture/seed-missing'||path==='/__fixture/clean-browser'){
    const script=path.endsWith('seed-missing')?"localStorage.setItem('course','fixture-deleted-course');localStorage.setItem('question','fixture-deleted-question');localStorage.setItem('language','en');":"for(const key of ['course','question','language'])localStorage.removeItem(key);";
    return send(200,`<!doctype html><title>Seed fixture preferences</title><p>Seeding this mocked fixture origin only.</p><script>${script}location.replace('/');</script>`,'text/html; charset=utf-8');
  }
  if(path.startsWith('/api/')){
    const requestId=randomUUID();
    let body:any={};try{body=raw?JSON.parse(raw):{};}catch{return send(400,{error:'Fixture JSON required.'});}
    const courseId=body.courseId || path.match(/^\/api\/courses\/([^/]+)/)?.[1];
    const requestedCourse=courses.find(course=>course.id===courseId);
    log({event:'request-start',requestId,path,courseId,questionId:body.questionId});
    res.on('close',()=>{if(!res.writableEnded)log({event:'client-closed',requestId,path,courseId});});
    const delayed = (mode==='ask'&&path==='/api/ask'&&courseId===courseA.id) || (mode==='grade'&&path==='/api/attempt') || (mode==='course-load'&&courseId===courseA.id&&/\/(questions|history)$/.test(path)) || (mode==='generation'&&path==='/api/generate-question');
    const finish=async(status:number,result:unknown)=>{if(delayed)await new Promise(resolve=>setTimeout(resolve,delayMs));log({event:'backend-finished',requestId,path,courseId,status,delayMs:delayed?delayMs:0,clientAlreadyClosed:res.destroyed});send(status,result);};
    if(path==='/api/status')return finish(200,{online:true,ready:true,model:'MOCK DELAY FIXTURE',embedding:'none',models:[]});
    if(path==='/api/courses')return finish(200,courses);
    if(path.endsWith('/questions'))return finish(200,allQuestions.filter(q=>q.courseId===courseId).map(publicQuestion));
    if(path.endsWith('/history'))return finish(requestedCourse?200:404,history.get(courseId)||{error:'Fixture course does not exist.'});
    if(path==='/api/attempt'){
      const q=allQuestions.find(q=>q.id===body.questionId);
      if(!q||!Number.isInteger(body.chosen))return finish(400,{error:'Invalid fixture answer.'});
      const c=courses.find(c=>c.id===q.courseId)!;
      const attempt={id:randomUUID(),questionId:q.id,concept:q.concept,kind:q.kind,prompt:q.prompt,options:q.options,chosen:body.chosen,correct:q.correct,isCorrect:body.chosen===q.correct,confidence:body.confidence,explanation:q.explanation,misconception:q.misconceptions[body.chosen]||'',sourceIds:q.sourceIds,sourceHash:c.hash,createdAt:new Date().toISOString()};
      history.get(c.id)!.attempts.push(attempt);return finish(200,attempt);
    }
    if(path==='/api/ask'&&requestedCourse){const record={question:body.question,answer:`MOCKED RESPONSE FOR ${courseId===courseA.id?'COURSE A':'COURSE B'} ONLY. This is a controlled UI delay fixture, not real model inference.`,insufficient:false,citations:[{sectionId:requestedCourse.sections[0].id,quote:requestedCourse.sections[0].text.slice(0,80)}],elapsedMs:delayed?delayMs:1,model:'MOCK DELAY FIXTURE — no model',sourceHash:requestedCourse.hash,createdAt:new Date().toISOString()};history.get(courseId)!.chats.push(record);return finish(200,record);}
    if(path==='/api/generate-question'&&requestedCourse){return finish(200,publicQuestion({...bQuestion,id:'fixture-generated-late',courseId:requestedCourse.id,prompt:'MOCKED LATE GENERATED QUESTION: should appear only if its originating context remains current.'}));}
    return finish(404,{error:'This mock fixture implements navigation and request isolation only.'});
  }
  const file = path.startsWith('/assets/') ? resolve(dist,'.'+decodeURIComponent(path)) : resolve(dist,'index.html');
  if(!file.startsWith(dist+sep)||!existsSync(file)||!statSync(file).isFile())return send(404,'Build the application dist first.','text/plain; charset=utf-8');
  const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file));
});
server.listen(port,'127.0.0.1',()=>console.log(`MOCKED TraceLearn race fixture: http://127.0.0.1:${port}/__fixture`));
