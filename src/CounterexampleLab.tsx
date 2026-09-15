import {useEffect, useState} from 'react';
import {ArrowRight, BookOpen, Download, FlaskConical, RotateCcw} from 'lucide-react';
import {analyzeKey, evaluateSqlRows, LAB_SCHEMAS, type SqlMode, type SqlValue} from './lab-model';
import {labReport, readLabAttempts, showSet, showValue, sqlExpression, type LabAttempt, type NewLabAttempt} from './lab-history';
import {preferences} from './environment';
import {downloadText} from './download';
import {defaultLabContext,type LabTransferContext} from './lab-transfer';

export type LabKind = 'sql' | 'keys';
type Props = {sourceHash: string; zh: boolean; onSource: (id: string) => void; onContext: (id: string) => void; initialContext?: LabTransferContext; onTransfer: (context: LabTransferContext) => void};
const storageKey = (hash: string) => `lab-attempts-v1:${hash}`;

export function CounterexampleLab({sourceHash, zh, onSource, onContext, initialContext = defaultLabContext, onTransfer}: Props) {
  const [kind, setKind] = useState<LabKind>(initialContext.kind);
  const [sqlMode, setSqlMode] = useState<SqlMode>(initialContext.kind==='sql'?initialContext.mode:'not-equal');
  const [keySchemaId, setKeySchemaId] = useState(initialContext.kind==='keys'?initialContext.schemaId:LAB_SCHEMAS[0].id);
  const [attempts, setAttempts] = useState(() => readLabAttempts(preferences.get(storageKey(sourceHash)), sourceHash));
  useEffect(() => {setKind(initialContext.kind);setSqlMode(initialContext.kind==='sql'?initialContext.mode:'not-equal');setKeySchemaId(initialContext.kind==='keys'?initialContext.schemaId:LAB_SCHEMAS[0].id);}, [initialContext]);
  useEffect(() => setAttempts(readLabAttempts(preferences.get(storageKey(sourceHash)), sourceHash)), [sourceHash]);
  function save(attempt: NewLabAttempt) {
    const record = {...attempt, id: crypto.randomUUID(), createdAt: new Date().toISOString(), sourceHash, schemaVersion: 1} as LabAttempt;
    setAttempts(old => { const next = [...old, record].slice(-100); preferences.set(storageKey(sourceHash), JSON.stringify(next)); return next; });
  }
  return <section className="counterexample-lab">
    <div className="eyebrow"><FlaskConical size={16}/>{zh ? '可执行的概念检查' : 'TEST THE IDEA, NOT JUST THE WORDS'}</div>
    <h2>{zh ? '改一个条件，结果还成立吗？' : 'Change one thing. Does it still hold?'}</h2>
    <p className="muted">{zh ? '先预测，再查看逐步计算。修改数据或属性，亲自检查概念的边界。' : 'Make a prediction, then inspect the computation. Change the data or attributes to find the boundary of your idea.'}</p>
    <div className="lab-switch" role="group" aria-label={zh ? '实验类型' : 'Experiment type'}>
      <button aria-pressed={kind === 'sql'} onClick={() => setKind('sql')}>SQL NULL</button>
      <button aria-pressed={kind === 'keys'} onClick={() => setKind('keys')}>{zh ? '候选键与闭包' : 'Keys & closure'}</button>
    </div>
    {kind === 'sql' ? <SqlExperiment key="sql" mode={sqlMode} onMode={setSqlMode} zh={zh} onSource={onSource} onContext={onContext} onSave={save}/> : <KeyExperiment key="keys" schemaId={keySchemaId} onSchema={setKeySchemaId} zh={zh} onSource={onSource} onContext={onContext} onSave={save}/>}
    <div className="lab-footer">
      <button className="secondary" onClick={() => onTransfer(kind === 'sql' ? {kind, mode:sqlMode} : {kind, schemaId:keySchemaId})}>{zh ? '回到迁移题独立作答' : 'Try a transfer question'}<ArrowRight size={15}/></button>
      <button className="text-button" disabled={!attempts.length} onClick={() => downloadText('TraceLearn-lab-record.md', labReport(attempts))}><Download size={14}/>{zh ? `导出实验记录 (${attempts.length})` : `Export lab record (${attempts.length})`}</button>
    </div>
    <p className="fineprint">{zh ? '计算过程不调用AI。保留最近100次实验，存于此浏览器；可导出留存。实验预测不计入题目正确率，也不代表掌握程度。' : 'No AI is used in these computations. The latest 100 experiments stay in this browser; export to keep a copy. Predictions are separate from quiz scores and do not certify mastery.'}</p>
  </section>;
}

type ExperimentProps = {zh: boolean; onSource: (id: string) => void; onContext: (id: string) => void; onSave: (attempt: NewLabAttempt) => void};
function SourceButtons({ids, onSource}: {ids: readonly string[]; onSource: (id: string) => void}) {
  return <div className="citation-row">{ids.map(id => <button className="citation" key={id} onClick={() => onSource(id)}><BookOpen size={12}/>{id}</button>)}</div>;
}
function parseValue(text: string): SqlValue {
  const value = text.trim();
  if (value.toUpperCase() === 'NULL') return null;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > 1e9) throw new Error('invalid');
  return Number(value);
}

function SqlExperiment({zh, onSource, onContext, onSave, mode, onMode}: ExperimentProps & {mode:SqlMode; onMode:(mode:SqlMode)=>void}) {
  const [values, setValues] = useState(['100', '200', 'NULL']);
  const [targetText, setTargetText] = useState('100');
  const [listText, setListText] = useState('100, NULL');
  const [prediction, setPrediction] = useState<boolean[]>([false, false, false]);
  const [predicted, setPredicted] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof evaluateSqlRows> | null>(null);
  function reset() { setResult(null); setPredicted(false); setPrediction(values.map(() => false)); }
  let parsed: {values: SqlValue[]; target: number; list: SqlValue[]} | null = null;
  try {
    const target = mode === 'not-in' ? 0 : parseValue(targetText); if (target === null) throw Error('target');
    const list = mode === 'not-in' ? listText.split(',').map(parseValue) : [target, null]; if (list.length > 8) throw Error('list');
    parsed = {values: values.map(parseValue), target, list};
  } catch { /* Visible validation below; never substitute a guessed value. */ }
  function run() {
    if (!parsed || !predicted) return;
    setResult(evaluateSqlRows(parsed.values, parsed.target, mode, parsed.list));
    onSave({kind: 'sql', ...parsed, mode, prediction: [...prediction]});
  }
  useEffect(() => onContext(mode === 'not-in' ? 'null-not-in' : 'null-where'), [mode, onContext]);
  const sourceIds = mode === 'not-in' ? ['null-not-in', 'null-where'] : mode === 'not-equal-negated' ? ['null-logic', 'null-where'] : ['null-comparison', 'null-where'];
  return <div className="experiment">
    <div className="lab-step"><span>1</span><h3>{zh ? '设置数据与条件' : 'Set the data and condition'}</h3></div>
    <p className="fineprint">{zh ? '输入数字或 NULL（缺失值）。每一行单独判断，重复值仍是不同的行。' : 'Enter numbers or NULL for missing values. Duplicate values are still separate rows.'}</p>
    <div className="lab-input-rows">{values.map((v, i) => <label key={i}>{zh ? '行' : 'Row'} {i + 1}<input aria-label={`${zh ? '行' : 'Row'} ${i + 1} ${zh ? '值' : 'value'}`} maxLength={24} spellCheck={false} value={v} onChange={e => { reset(); setValues(old => old.map((x, n) => n === i ? e.target.value : x)); }}/></label>)}</div>
    <div className="lab-row-actions"><button className="text-button" disabled={values.length >= 6} onClick={() => { reset(); setValues([...values, 'NULL']); setPrediction([...values, 'NULL'].map(() => false)); }}>{zh ? '增加一行' : 'Add row'}</button><button className="text-button" disabled={values.length <= 1} onClick={() => { reset(); setValues(values.slice(0, -1)); setPrediction(values.slice(0, -1).map(() => false)); }}>{zh ? '移除末行' : 'Remove last row'}</button></div>
    <div className="lab-controls"><label>{zh ? '条件' : 'Condition'}<select value={mode} onChange={e => { reset(); onMode(e.target.value as SqlMode); }}><option value="not-equal">value &lt;&gt; target</option><option value="not-equal-negated">NOT (value = target)</option><option value="not-equal-or-null">value &lt;&gt; target OR value IS NULL</option><option value="not-in">value NOT IN (list)</option></select></label>
      {mode === 'not-in' ? <label>{zh ? '比较列表（逗号分隔）' : 'List (comma separated)'}<input value={listText} maxLength={180} onChange={e => { reset(); setListText(e.target.value); }}/></label> : <label>{zh ? '目标数字' : 'Target number'}<input value={targetText} maxLength={24} onChange={e => { reset(); setTargetText(e.target.value); }}/></label>}
    </div>
    {!parsed && <p role="alert" className="error">{zh ? '请使用 -10亿 到 10亿 的有限数字或 NULL。列表需要1至8项，目标必须是数字。' : 'Use finite numbers between −1 billion and 1 billion, or NULL. Lists need 1–8 items; the target must be a number.'}</p>}
    {parsed && <code className="lab-expression">WHERE {sqlExpression(mode, parsed.target, parsed.list)}</code>}
    <div className="lab-step"><span>2</span><h3>{zh ? '先预测：哪些行会保留？' : 'Predict: which rows survive?'}</h3></div>
    <fieldset className="lab-predictions" disabled={!!result || !parsed}><legend className="sr-only">{zh ? '预测保留的行' : 'Predicted surviving rows'}</legend>{values.map((v, i) => <label key={i}><input type="checkbox" checked={prediction[i] || false} onChange={e => { setPredicted(true); setPrediction(old => values.map((_, n) => n === i ? e.target.checked : !!old[n])); }}/><span>{zh ? '行' : 'Row'} {i + 1} <code>{v}</code></span></label>)}</fieldset>
    {!result && <div className="lab-row-actions"><button className="secondary" aria-pressed={predicted && prediction.every(v => !v)} onClick={() => { setPrediction(values.map(() => false)); setPredicted(true); }}>{zh ? '我预测没有行通过' : 'I predict no rows pass'}</button><button className="primary" disabled={!parsed || !predicted} onClick={run}>{zh ? '运行并核对预测' : 'Run & check prediction'}<ArrowRight size={16}/></button></div>}
    {result && <div className="lab-result" role="status"><div className="lab-result-title"><FlaskConical size={17}/><strong>{result.every((r, i) => r.kept === prediction[i]) ? (zh ? '预测与计算一致。' : 'Your prediction matches this computation.') : (zh ? '发现反例：核对不同的行。' : 'A counterexample: inspect the rows that differ.')}</strong></div>
      <div className="table-scroll"><table className="lab-table"><thead><tr><th>{zh ? '行 / 值' : 'Row / value'}</th><th>{zh ? '你的预测' : 'Your prediction'}</th><th>{zh ? '条件结果' : 'Predicate'}</th><th>WHERE</th></tr></thead><tbody>{result.map((r, i) => <tr key={i} className={r.kept !== prediction[i] ? 'lab-mismatch' : ''}><th>{i + 1} · {showValue(r.value)}</th><td>{prediction[i] ? (zh ? '保留' : 'Keep') : (zh ? '排除' : 'Exclude')}</td><td><code>{r.truth}</code></td><td>{r.kept ? (zh ? '保留' : 'Kept') : (zh ? '排除' : 'Excluded')}{r.kept !== prediction[i] && <span className="difference">{zh ? '与预测不同' : 'Different'}</span>}</td></tr>)}</tbody></table></div>
      <p>{zh ? 'WHERE 只保留 TRUE，FALSE 和 UNKNOWN 都被排除。' : 'WHERE keeps only TRUE. FALSE and UNKNOWN are excluded.'} {mode === 'not-in'
        ? parsed?.list.includes(null)
          ? (zh ? '从比较列表中移除 NULL，再预测一次；核对哪些行的条件结果发生变化。' : 'Remove NULL from the comparison list, predict again, and inspect which predicate results change.')
          : (zh ? '在比较列表中加入 NULL，再预测一次；核对哪些行的条件结果发生变化。' : 'Add NULL to the comparison list, predict again, and inspect which predicate results change.')
        : mode === 'not-equal-or-null'
          ? (zh ? '切换回 value <> target，再预测一次，对比缺失值所在行。' : 'Switch back to value <> target, predict again, and compare the row with the missing value.')
          : (zh ? '把条件改为 OR value IS NULL，再预测一次，观察缺失值的变化。' : 'Change the condition to OR value IS NULL, predict again, and watch what happens to the missing value.')}</p>
      <button className="text-button" onClick={reset}><RotateCcw size={14}/>{zh ? '用这些输入重新预测' : 'Predict again with these inputs'}</button>
    </div>}
    <SourceButtons ids={sourceIds} onSource={onSource}/>
    <p className="fineprint">{zh ? '这是限定条件的三值逻辑模拟器，已与真实 SQLite 对照测试；它不解析任意 SQL。' : 'A bounded three-valued-logic simulator, differential-tested against real SQLite. It does not parse arbitrary SQL.'}</p>
  </div>;
}

function KeyExperiment({zh, onSource, onContext, onSave, schemaId, onSchema}: ExperimentProps & {schemaId:string; onSchema:(schemaId:string)=>void}) {
  const schema = LAB_SCHEMAS.find(s => s.id === schemaId)!;
  const [selected, setSelected] = useState<string[]>([...schema.initialSelection]);
  const [prediction, setPrediction] = useState<'candidate' | 'superkey-only' | 'not-superkey' | ''>('');
  const [result, setResult] = useState<ReturnType<typeof analyzeKey> | null>(null);
  function reset() { setPrediction(''); setResult(null); }
  function run() {
    if (!prediction) return;
    setResult(analyzeKey(selected, schema.universe, schema.fds));
    onSave({kind: 'keys', schemaId, selected: [...selected], prediction});
  }
  useEffect(() => onContext(schema.sourceIds[0]), [schema, onContext]);
  const classification = result?.isMinimal ? 'candidate' : result?.isSuperkey ? 'superkey-only' : 'not-superkey';
  return <div className="experiment">
    <div className="lab-step"><span>1</span><h3>{zh ? '选择关系与属性' : 'Choose a relation and attributes'}</h3></div>
    <label className="lab-schema">{zh ? '关系' : 'Relation'}<select value={schemaId} onChange={e => { const next = LAB_SCHEMAS.find(s => s.id === e.target.value)!; onSchema(next.id); setSelected([...next.initialSelection]); reset(); }}>{LAB_SCHEMAS.map(s => <option key={s.id} value={s.id}>{zh ? s.titleZh : s.title}</option>)}</select></label>
    <p className="muted">{zh ? schema.descriptionZh : schema.description}</p>
    <div className="lab-fds">{schema.fds.map((fd, i) => <code key={i}>{fd.left.join('')} → {fd.right.join('')}</code>)}</div>
    <fieldset className="lab-attributes"><legend>{zh ? '待检查属性集合 X' : 'Attribute set X to test'}</legend>{schema.universe.map(attr => <label key={attr}><input type="checkbox" checked={selected.includes(attr)} onChange={e => { setSelected(old => e.target.checked ? [...old, attr] : old.filter(a => a !== attr)); reset(); }}/><span>{attr}</span></label>)}</fieldset>
    <div className="lab-step"><span>2</span><h3>{zh ? '在计算前分类' : 'Classify before computing'}</h3></div>
    <fieldset className="lab-classifications" disabled={!!result}><legend className="sr-only">{zh ? '预测键的类型' : 'Predict key classification'}</legend>{([
      ['candidate', zh ? '候选键：能确定所有属性，且不可删减' : 'Candidate key: determines everything; no removable attribute'],
      ['superkey-only', zh ? '超键但不是候选键：仍可删减' : 'Superkey, but not a candidate key: an attribute is removable'],
      ['not-superkey', zh ? '不是超键：仍有属性无法确定' : 'Not a superkey: some attributes cannot be derived']
    ] as const).map(([value, label]) => <label key={value}><input type="radio" name="key-prediction" value={value} checked={prediction === value} onChange={() => setPrediction(value)}/><span>{label}</span></label>)}</fieldset>
    {!result && <button className="primary" disabled={!prediction} onClick={run}>{zh ? '计算闭包与最小性' : 'Compute closure & minimality'}<ArrowRight size={16}/></button>}
    {result && <div className="lab-result" role="status"><div className="lab-result-title"><FlaskConical size={17}/><strong>{classification === prediction ? (zh ? '预测与计算一致。' : 'Your prediction matches this computation.') : (zh ? '计算揭示了不同结果。' : 'The computation reveals a different result.')}</strong></div>
      <p className="lab-closure"><code>{showSet(selected)}⁺ = {showSet(result.closure)}</code></p>
      <ol className="closure-trace"><li>{zh ? '从所选属性开始' : 'Start with the selected attributes'} <code>{showSet(selected)}</code></li>{result.steps.map((step, i) => <li key={i}><code>{step.rule.left.join('')} → {step.rule.right.join('')}</code>{zh ? ' 添加 ' : ' adds '}<code>{showSet(step.added)}</code><span> → {showSet(step.closure)}</span></li>)}<li>{zh ? '没有规则能加入更多属性，停止。' : 'No rule can add another attribute. Stop.'}</li></ol>
      <p><strong>{result.isMinimal ? (zh ? '这是候选键。' : 'This is a candidate key.') : result.isSuperkey ? (zh ? '这是超键，但不是候选键。' : 'This is a superkey, but not a candidate key.') : (zh ? '这不是超键。' : 'This is not a superkey.')}</strong> {result.missing.length ? (zh ? '无法推出：' : 'Cannot derive: ') + showSet(result.missing) : (zh ? '闭包覆盖关系的全部属性。' : 'The closure covers the complete relation.')}</p>
      {result.isSuperkey && <><h4>{zh ? '尝试移除每个属性' : 'Try removing each attribute'}</h4><div className="table-scroll"><table className="lab-table"><thead><tr><th>{zh ? '移除' : 'Remove'}</th><th>{zh ? '剩余集合的闭包' : 'Closure without it'}</th><th>{zh ? '仍是超键？' : 'Still a superkey?'}</th></tr></thead><tbody>{selected.map(attr => { const reduced = analyzeKey(selected.filter(a => a !== attr), schema.universe, schema.fds); return <tr key={attr}><th>{attr}</th><td><code>{showSet(reduced.closure)}</code></td><td>{reduced.isSuperkey ? (zh ? '是，可删除' : 'Yes — removable') : (zh ? '否，必须保留' : 'No — needed')}</td></tr>; })}</tbody></table></div><p className="fineprint">{zh ? '闭包具有单调性：若移除任一单个属性都不再是超键，则没有更小的子集是超键。' : 'Closure is monotone: if removing any single attribute loses the superkey property, no smaller subset can be a superkey.'}</p></>}
      <button className="text-button" onClick={reset}><RotateCcw size={14}/>{zh ? '重新预测' : 'Make another prediction'}</button>
    </div>}
    <SourceButtons ids={schema.sourceIds} onSource={onSource}/>
    <p className="fineprint">{zh ? '结果基于上方明确给出的函数依赖，不依据小样本表猜测约束，也不自动证明所有范式。' : 'Results follow the stated dependencies. A small data sample cannot establish these constraints, and this trace does not automatically prove every normal form.'}</p>
  </div>;
}
