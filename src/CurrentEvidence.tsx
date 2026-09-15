import {useId,useState} from 'react';
import {BookOpen,FlaskConical} from 'lucide-react';
import './current-evidence.css';

export type CurrentEvidenceCitation={sectionId:string;quote:string};
export type CurrentEvidenceSource={id:string;title:string;text:string};
export type CurrentEvidenceReview={taskCorrect:boolean;evidenceValid:boolean|null;rationale:string;failureFlags:string[]};
export type CurrentEvidenceRecord={
  id:string;
  split:'development'|'holdout';
  category:string;
  question:string;
  reference:string;
  expectedInsufficient:boolean;
  mode:'frozen-grounded'|'supported';
  model:string;
  answer?:string;
  error?:string;
  wallMs:number;
  outcome:string;
  claims:{text:string;citations:CurrentEvidenceCitation[]}[];
  citations:CurrentEvidenceCitation[];
  sources:CurrentEvidenceSource[];
  review:CurrentEvidenceReview;
};
export type CurrentEvidenceData={provenance:string;rawHashes:string[];records:CurrentEvidenceRecord[]};
export type CurrentEvidenceProps={data:CurrentEvidenceData;zh?:boolean};
type ResultFilter='all'|'correct'|'failed'|'missing';
const modes=['frozen-grounded','supported'] as const;
const notDelivered=(record:CurrentEvidenceRecord)=>Boolean(record.error?.trim())||!record.answer?.trim()||record.outcome==='unverified';
const modeLabel=(mode:CurrentEvidenceRecord['mode'],zh:boolean)=>mode==='supported'
  ?(zh?'当前配置':'Current configuration'):(zh?'冻结旧配置':'Frozen configuration');

function SavedCitation({citation,record,zh}:{citation:CurrentEvidenceCitation;record:CurrentEvidenceRecord;zh:boolean}){
  // Only this request's saved source snapshot may resolve a citation.
  const sources=record.sources.filter(source=>source.id===citation.sectionId);
  return <div className="ce-citation">
    <span className="ce-citation-id"><BookOpen size={13} aria-hidden="true"/>{citation.sectionId}</span>
    <blockquote>{citation.quote}</blockquote>
    <details>
      <summary>{zh?'展开本次输入中的完整原文':'Expand the full passage from this request'}</summary>
      {sources.length?sources.map((source,index)=><div className="ce-source" key={index}>
        <strong>{source.title}</strong><p>{source.text}</p>
      </div>):<p className="ce-warning">{zh?'本次保存的输入中没有这个段落。无法定位此引用；不会用内置课程替换。':'This passage is absent from this record’s saved inputs. The citation cannot be located here; no built-in course is substituted.'}</p>}
    </details>
  </div>;
}

function RecordedResult({record,zh}:{record:CurrentEvidenceRecord;zh:boolean}){
  const undelivered=notDelivered(record);
  const conflicting=record.review.taskCorrect&&(undelivered||record.review.evidenceValid===false);
  const evidenceLabel=record.review.evidenceValid===null
    ?(zh?'未评分 / 不适用':'Not scored / not applicable')
    :record.review.evidenceValid?(zh?'有效':'Valid'):(zh?'无效':'Invalid');
  return <article className="ce-result">
    <header className="ce-result-heading"><h3>{modeLabel(record.mode,zh)}</h3><span>{Number.isFinite(record.wallMs)?`${(record.wallMs/1000).toFixed(2)} s`:(zh?'耗时未记录':'Timing not recorded')}</span></header>
    <p className="ce-model">{record.model}</p>
    <div className="ce-tags">
      <span className={`ce-tag ${record.review.taskCorrect?'ce-pass':'ce-fail'}`}>{record.review.taskCorrect?(zh?'严格正确 · 保存的评分':'Strictly correct · saved review'):(zh?'未达到严格正确 · 保存的评分':'Not strictly correct · saved review')}</span>
      {undelivered&&<span className="ce-tag ce-fail">{zh?'未交付':'Not delivered'}</span>}
    </div>
    {conflicting&&<p className="ce-warning">{zh?'保存的“严格正确”评分与未交付或引用无效状态冲突。这里保留并显示原始字段，不自动改分。':'The saved “strictly correct” review conflicts with a delivery or evidence failure. Original fields are shown without changing the saved score.'}</p>}
    <h4>{zh?'保存的最终回答':'Saved final answer'}</h4>
    {record.answer?.trim()?<p className="ce-answer">{record.answer}</p>:<p className="ce-small">{zh?'没有保存最终回答。':'No final answer was saved.'}</p>}
    {record.error&&<div className="ce-error"><strong>{zh?'保存的错误':'Saved error'}</strong><p>{record.error}</p></div>}
    <div className="ce-review"><h4>{zh?'评分理由':'Why this score'}</h4>
      <p>{record.review.rationale||(zh?'没有保存评分理由。':'No review rationale was saved.')}</p>
      <details className="ce-scoring"><summary>{zh?'评分字段与运行状态':'Scoring fields and run status'}</summary>
        <dl><div><dt><code>taskCorrect</code></dt><dd>{record.review.taskCorrect?'true':'false'}</dd></div><div><dt>{zh?'引用有效性':'Evidence validity'}</dt><dd>{evidenceLabel}</dd></div><div><dt>{zh?'运行状态（不是正确性评分）':'Run outcome (not a correctness score)'}</dt><dd><code>{record.outcome||'—'}</code></dd></div></dl>
        {!!record.review.failureFlags.length&&<><strong>{zh?'失败标记':'Failure flags'}</strong><ul>{record.review.failureFlags.map((flag,index)=><li key={index}><code>{flag}</code></li>)}</ul></>}
      </details>
    </div>
    <details className="ce-evidence"><summary>{zh?'核对主张、引用与输入原文':'Inspect claims, citations, and source inputs'}</summary>
      {!!record.claims.length&&<section className="ce-claims"><h4>{zh?'保存的逐条主张与引用':'Saved claims and their citations'}</h4>
        <ol>{record.claims.map((claim,index)=><li key={index}>
          <p className="ce-answer">{claim.text}</p>
          {claim.citations.length?claim.citations.map((citation,citationIndex)=><SavedCitation key={citationIndex} citation={citation} record={record} zh={zh}/>):<p className="ce-small">{zh?'这条主张没有保存引用。':'No citations were saved for this claim.'}</p>}
        </li>)}</ol>
      </section>}
      <section className="ce-citations"><h4>{zh?'最终记录的引用列表':'Final record’s citation list'} · {record.citations.length}</h4>
        {record.citations.length?record.citations.map((citation,index)=><SavedCitation key={index} citation={citation} record={record} zh={zh}/>):<p className="ce-small">{zh?'没有保存引用。':'No citations were saved.'}</p>}
      </section>
      <details className="ce-inputs"><summary>{zh?'完整输入原文快照':'Complete input passage snapshot'} · {record.sources.length}</summary>
        <p className="ce-small">{zh?'只展示本次记录保存的段落，不代表完整课程。':'These are only the passages saved for this request, not necessarily the complete course.'}</p>
        {record.sources.length?record.sources.map((source,index)=><details className="ce-input-passage" key={index}><summary>{source.id} · {source.title}</summary><p className="ce-source-text">{source.text}</p></details>):<p className="ce-small">{zh?'没有保存输入原文快照。':'No input passage snapshot was saved.'}</p>}
      </details>
    </details>
  </article>;
}

export function CurrentEvidence({data,zh=false}:CurrentEvidenceProps){
  const headingId=useId();
  const [split,setSplit]=useState<CurrentEvidenceRecord['split']>('holdout');
  const [filter,setFilter]=useState<ResultFilter>('all');
  const [selectedId,setSelectedId]=useState('');
  const splitRecords=data.records.filter(record=>record.split===split);
  const groups=new Map<string,CurrentEvidenceRecord[]>();
  for(const record of splitRecords){const group=groups.get(record.id)||[];group.push(record);groups.set(record.id,group);}
  const cases=[...groups.entries()].filter(([,records])=>{
    const current=records.filter(record=>record.mode==='supported');
    if(filter==='all')return true;
    if(filter==='missing')return current.length===0;
    return current.some(record=>filter==='correct'?record.review.taskCorrect:!record.review.taskCorrect);
  });
  const selected=cases.find(([id])=>id===selectedId)||cases[0];
  const selectedRecords=selected?.[1]||[];
  const example=selectedRecords.find(record=>record.mode==='supported')||selectedRecords[0];
  const mismatched=example&&selectedRecords.some(record=>record.question!==example.question||record.reference!==example.reference||record.expectedInsufficient!==example.expectedInsufficient);
  const splitLabel=split==='holdout'?(zh?'保留测试集':'Holdout'):(zh?'开发集':'Development');
  return <section className="current-evidence" aria-labelledby={headingId}>
    <div className="eyebrow"><FlaskConical size={16} aria-hidden="true"/>{zh?'逐案例核对':'CASE-BY-CASE EVIDENCE'}</div>
    <h2 id={headingId}>{zh?'回答、引用和评分，一起核对。':'Inspect the answer, its evidence, and its score.'}</h2>
    <div className="ce-notice"><strong>{zh?'已保存的实验记录 · 非实时模型输出':'RECORDED EXPERIMENT · NOT LIVE MODEL OUTPUT'}</strong>
      <p>{zh?'由编写数据集的 Codex 代理评分；没有独立人工评审，也不是学习效果证据。':'Scored by the Codex agent that authored the dataset. No independent human review or learning-effect study.'}</p>
    </div>
    <div className="ce-filters">
      <label>{zh?'数据划分':'Dataset split'}<select value={split} onChange={event=>{setSplit(event.target.value as CurrentEvidenceRecord['split']);setSelectedId('');}}><option value="holdout">{zh?'保留测试集':'Holdout'}</option><option value="development">{zh?'开发集':'Development'}</option></select></label>
      <label>{zh?'按当前配置的保存评分筛选':'Filter by the current configuration’s saved review'}<select value={filter} onChange={event=>{setFilter(event.target.value as ResultFilter);setSelectedId('');}}><option value="all">{zh?'全部案例':'All cases'}</option><option value="correct">{zh?'严格正确':'Strictly correct'}</option><option value="failed">{zh?'未达到严格正确':'Not strictly correct'}</option><option value="missing">{zh?'缺少当前配置记录':'Missing current record'}</option></select></label>
    </div>
    <p className="ce-small">{zh?`${splitLabel}全部记录的保存评分；统计不随结果筛选变化。`:`${splitLabel} totals from saved scoring judgments; unchanged by the result filter.`}</p>
    <div className="ce-metrics">{modes.map(mode=>{
      const records=splitRecords.filter(record=>record.mode===mode);
      return <div key={mode}><h3>{modeLabel(mode,zh)}</h3><p><strong>{records.filter(record=>record.review.taskCorrect).length}<small> / {records.length}</small></strong><span>{zh?'严格正确 / 总记录':'Strictly correct / total records'}</span></p><p className="ce-undelivered">{zh?'未交付':'Not delivered'}: <b>{records.filter(notDelivered).length}</b></p></div>;
    })}</div>
    <p className="ce-small" role="status">{zh?`当前显示 ${cases.length} / ${groups.size} 个案例。`:`Showing ${cases.length} of ${groups.size} cases.`}</p>
    {example&&selected?<>
      <label className="ce-picker">{zh?'选择案例':'Choose a case'}<select value={selected[0]} onChange={event=>setSelectedId(event.target.value)}>{cases.map(([id,records])=><option value={id} key={id}>{id} · {records[0].question}</option>)}</select></label>
      <div className="ce-case-meta"><span>{example.id}</span><span>{example.category}</span><span>{example.expectedInsufficient?(zh?'参考要求：材料不足拒答':'Reference expects: insufficient-source refusal'):(zh?'参考要求：回答问题':'Reference expects: an answer')}</span></div>
      <p className="ce-question">{example.question}</p>
      <details className="ce-reference"><summary>{zh?'查看参考答案':'Inspect the reference answer'}</summary><p>{example.reference}</p></details>
      {mismatched&&<p className="ce-warning">{zh?'同编号的两组记录包含不同的问题或参考答案，不能直接比较。下方保留各记录自身的问题和参考。':'Records with this ID have different questions or references and cannot be compared directly. Each record’s original question and reference are shown below.'}</p>}
      <div className="ce-comparison" key={`${split}-${selected[0]}`}>{modes.map(mode=>{
        const records=selectedRecords.filter(record=>record.mode===mode);
        return <div className="ce-config-column" key={mode}>
          {records.length>1&&<p className="ce-warning">{zh?`这个配置有 ${records.length} 条记录，全部保留如下；统计分母按记录计。`:`This configuration has ${records.length} records. All are retained below; totals count records.`}</p>}
          {records.length?records.map((record,index)=><div key={index}>{mismatched&&<details className="ce-reference"><summary>{zh?'本记录的问题与参考':'This record’s question and reference'}</summary><p>{record.question}</p><p>{record.reference}</p><p>expectedInsufficient = {String(record.expectedInsufficient)}</p></details>}<RecordedResult record={record} zh={zh}/></div>):<article className="ce-result ce-empty"><h3>{modeLabel(mode,zh)}</h3><p>{zh?'本案例没有这个配置的保存记录。':'No saved record for this configuration and case.'}</p></article>}
        </div>;
      })}</div>
    </>:<p className="ce-empty">{!data.records.length?(zh?'尚无可展示的实验记录。没有生成或补造示例数据。':'No experiment records are available. No example results have been generated or substituted.'):!splitRecords.length?(zh?'这个数据划分没有保存记录。可切换数据划分查看。':'No records are saved for this split. Select another split to inspect its records.'):(zh?'没有符合当前筛选条件的案例。':'No cases match the current filter.')}</p>}
    <details className="ce-provenance"><summary>{zh?'记录来源、原始文件哈希与限制':'Provenance, raw file hashes, and limits'}</summary>
      <p>{data.provenance||(zh?'没有提供来源说明。':'No provenance description was supplied.')}</p>
      <p>{zh?'查看器只展示传入的冻结记录，不运行模型或重新评分。引用展开的是各次请求自身保存的原文快照。':'This viewer displays the supplied frozen records without running a model or rescoring them. Citation disclosures use each request’s own saved source snapshot.'}</p>
      <p>{zh?'严格正确数量直接采用保存评分，自动支持检查通过不等于答案正确。未交付指保存了错误、没有最终回答，或运行状态为 unverified；材料不足拒答本身不算未交付。':'Strictly correct counts use saved scoring judgments, not automated support-check outcomes. Not delivered means a saved error, no final answer, or an unverified outcome; an insufficient-source refusal alone is not a delivery failure.'}</p>
      <h4>{zh?'原始文件哈希':'Raw file hashes'}</h4>
      {data.rawHashes.length?<ul>{data.rawHashes.map((hash,index)=><li key={index}><code>{hash}</code></li>)}</ul>:<p>{zh?'没有提供原始文件哈希。':'No raw file hashes were supplied.'}</p>}
    </details>
  </section>;
}
