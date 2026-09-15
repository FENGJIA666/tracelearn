import {useState} from 'react';
import {ArrowUpRight,BookOpen,FlaskConical} from 'lucide-react';
import data from './generated/review-data.json';

type RecordRow = {id:string;mode:string;ok:boolean;answer?:string;error?:string;elapsedMs:number;insufficient?:boolean;citations?:{sectionId:string;quote:string}[];sourceIds:string[];quizCorrect?:boolean|null};
const records = data.records as RecordRow[];
const reviews = data.reviews as {id:string;mode:string;answerVerdict?:string;verdict?:string;rationale?:string;note?:string}[];
export function EvidenceLab({onSource,zh}:{onSource:(id:string)=>void;zh:boolean}) {
  const [split,setSplit] = useState('holdout');
  const [category,setCategory] = useState('all');
  const [id,setId] = useState('in-4');
  const cases = data.dataset.filter(c => c.split===split && (category==='all'||c.category===category));
  const selected = cases.find(c=>c.id===id)||cases[0];
  const paired = records.filter(r=>r.id===selected.id);
  return <section className="evidence-lab">
    <div className="eyebrow"><FlaskConical size={16}/>{zh?'可检查的实验记录':'INSPECT THE EXPERIMENT'}</div>
    <h2>{zh?'每个数字，都能追溯。':'Every number has a trail.'}</h2>
    <p className="recorded-notice">{zh?'历史记录 · 2026年9月14日 · 非实时AI输出':'RECORDED RUN · 14 SEP 2026 · NOT LIVE AI'}</p>
    <p className="muted">{zh?'80条原创案例，两种方法，共160次请求。完整展示回答和失败，不把输出校验通过当成答案正确。':'80 original cases. Two methods. All 160 requests, including failures. An accepted output is not necessarily correct.'}</p>
    <div className="evidence-filters">
      <label>{zh?'数据划分':'Split'}<select value={split} onChange={e=>setSplit(e.target.value)}><option value="holdout">Holdout · 40</option><option value="development">Development · 40</option></select></label>
      <label>{zh?'案例类型':'Case type'}<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All cases</option><option value="answerable">Source-answerable</option><option value="unanswerable">Outside source</option><option value="quiz">Multiple choice</option></select></label>
    </div>
    <label className="case-picker">{zh?'选择案例':'Choose a case'}<select value={selected.id} onChange={e=>setId(e.target.value)}>{cases.map(c=><option value={c.id} key={c.id}>{c.id} · {c.prompt}</option>)}</select></label>
    <p className="evidence-question">{selected.prompt}</p>
    <details className="reference"><summary>{zh?'查看原始参考答案':'Inspect the original reference'}</summary><p>{selected.reference}</p><div className="citation-row">{selected.sourceIds.map(s=><button className="citation" key={s} onClick={()=>onSource(s)}><BookOpen size={12}/>{s}</button>)}</div></details>
    <div className="recorded-results">{['baseline','grounded'].map(mode=>{
      const row=paired.find(r=>r.mode===mode)!;const review=reviews.find(r=>r.id===row.id&&r.mode===mode);
      return <article className="recorded-result" key={mode}>
        <div className="row"><h3>{mode==='baseline'?(zh?'完整原文基线':'Full-source baseline'):(zh?'混合检索':'Hybrid retrieval')}</h3><span>{(row.elapsedMs/1000).toFixed(2)}s</span></div>
        <div className="recorded-tags"><span className={`badge ${row.ok?'green':'amber'}`}>{row.ok?(zh?'输出校验通过':'Output checks passed'):(zh?'校验失败':'Validation failure')}</span>{row.insufficient!==undefined&&<span>insufficient = {String(row.insufficient)}</span>}</div>
        <p className="recorded-answer">{row.answer||row.error}</p>
        {row.quizCorrect!==null&&row.quizCorrect!==undefined&&<p className="fineprint">{zh?'提取的选择题答案':'Extracted MCQ key'}: {row.quizCorrect?'correct':'incorrect'}</p>}
        {review?<div className="agent-review"><strong>{zh?'Codex辅助复核 · 非独立人工评分':'Codex-assisted review · not independent human scoring'}</strong><p>{(review.answerVerdict||review.verdict||'').replaceAll('_',' ')} — {review.rationale||review.note}</p></div>:<p className="fineprint">{zh?'本案例没有独立的语义评分。':'No saved semantic review for this case.'}</p>}
        <details><summary>{zh?'核对引用与输入原文':'Inspect citations and input passages'} ({row.citations?.length||0} / {row.sourceIds.length})</summary>
          {row.citations?.map((c,i)=><button className="quote-card" key={i} onClick={()=>onSource(c.sectionId)}><span><BookOpen size={13}/>{c.sectionId}<ArrowUpRight size={12}/></span><q>{c.quote}</q></button>)}
          <div className="citation-row">{row.sourceIds.map(s=><button className="citation" key={s} onClick={()=>onSource(s)}>{s}</button>)}</div>
          {!row.ok&&<p className="fineprint">{zh?'失败请求只保留错误记录，不包含每次尝试的底层模型文本。':'Failed requests retain the error record, not every rejected model token or input snapshot.'}</p>}
        </details>
      </article>;
    })}</div>
    <details className="provenance"><summary>{zh?'记录来源与适用边界':'Provenance and limits'}</summary><p>{data.provenance}</p><p>{zh?'同一模型、提示词及引用校验；基线使用20段原文，混合检索使用5段。这是作者创建的内部数据，没有独立学生研究或提分证据。':'Same model, prompt and quote validator: the baseline receives all 20 passages; hybrid retrieval receives five. This is an author-created internal benchmark, with no independent student study or measured learning gains.'}</p><code className="hash">raw-results.jsonl SHA-256<br/>{data.rawSha256}</code></details>
  </section>;
}
