import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Square,Sparkles} from 'lucide-react';
import {api} from './api';
import {SupportAnswer} from './SupportAnswer';
import {createRequestScope} from './request-scope';
export function Ask({courseId,ready,onSource,onDone,prefill,zh}:{courseId:string;ready:boolean;onSource:(id:string)=>void;onDone:()=>void;prefill:string;zh:boolean}){
 const[query,setQuery]=useState(''),[result,setResult]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const scope=useRef(createRequestScope()),context=useRef({courseId,prefill});context.current={courseId,prefill};
 useEffect(()=>{scope.current.cancel();setBusy(false);setResult(null);setQuery(prefill);setError('');return()=>scope.current.cancel()},[courseId,prefill]);
 function cancel(){scope.current.cancel();setBusy(false);setError(zh?'已取消当前请求。你可以重新提问。':'This request was cancelled. You can ask again.')}
 function changeQuery(value:string){scope.current.cancel();setBusy(false);setQuery(value);setResult(null);setError('')}
 async function ask(q=query){if(busy||!ready||q.trim().length<3)return;setQuery(q);setBusy(true);setError('');setResult(null);const request=scope.current.begin();const current=()=>request.isCurrent()&&context.current.courseId===courseId&&context.current.prefill===prefill;try{const r=await api('/ask',{courseId,question:q,language:zh?'zh':'en'},request.signal);if(current()){setResult(r);onDone()}}catch(e){if(current())setError((e as Error).message)}finally{if(current())setBusy(false)}}
 return <section className="ask"><div className="eyebrow"><Sparkles size={16}/>{zh?'本地模型 · 以原文为依据':'LOCAL AI · GROUNDED IN YOUR SOURCE'}</div><h2>{zh?'理解每个“为什么”。':'Understand the why.'}</h2><p className="muted">{zh?'模型从所选课程提取证据、逐条作答，再检查每条主张和问题覆盖情况。证据不足或检查未通过时，不接受解释。自动检查仍可能出错。':'Trace each claim back to your notes. The local model drafts an answer, then reviews its support and coverage. Missing evidence or failed checks leave the explanation unaccepted. Automated checks can still be wrong.'}</p><form onSubmit={e=>{e.preventDefault();ask()}}><label className="sr-only" htmlFor="question">{zh?'关于材料的问题':'Question about the source'}</label><textarea id="question" maxLength={1200} value={query} onChange={e=>changeQuery(e.target.value)} placeholder={zh?'例如：为什么 NOT IN 遇到 NULL 会出问题？':'Why does NOT IN behave unexpectedly with NULL?'} rows={3}/><div className="ask-toolbar"><span>{query.length}/1200</span>{busy?<button key="cancel-request" type="button" className="secondary" onClick={e=>{e.preventDefault();cancel()}}><Square size={13}/>{zh?'取消':'Cancel'}</button>:<button key="submit-question" type="submit" className="primary" disabled={!ready||query.trim().length<3}>{zh?'询问原文':'Ask the source'}<ArrowUpRight size={16}/></button>}</div></form>
 {!result&&!busy&&<div className="suggestions">{['Why does salary <> 100 exclude NULL?','How is 3NF different from BCNF?','What will be on my university exam?'].map(q=><button disabled={!ready} key={q} onClick={()=>ask(q)}>{q}<ArrowUpRight size={14}/></button>)}</div>}
 {busy&&<div className="thinking" role="status"><div className="pulse"/><div><strong>{zh?'正在本机检索、作答与复核':'Retrieving, drafting, and reviewing locally'}</strong><p>{zh?'首次索引可能需要更久；最多等待3分钟，随时可以取消。材料始终保留在本机。':'First-time indexing can take longer. Up to 3 minutes; cancel any time. Your document stays on this device.'}</p></div></div>}
 {error&&<p role="alert" className="error">{error}</p>}
 {result&&<SupportAnswer result={result} zh={zh} onSource={onSource}/>}
 </section>
}
