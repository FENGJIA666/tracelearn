import {analyzeKey, evaluateSqlRows, LAB_SCHEMAS, type SqlMode, type SqlValue} from './lab-model';

type BaseAttempt = {id: string; createdAt: string; sourceHash: string; schemaVersion: 1};
export type SqlAttempt = BaseAttempt & {kind: 'sql'; values: SqlValue[]; target: number; mode: SqlMode; list: SqlValue[]; prediction: boolean[]};
export type KeyAttempt = BaseAttempt & {kind: 'keys'; schemaId: string; selected: string[]; prediction: 'candidate' | 'superkey-only' | 'not-superkey'};
export type LabAttempt = SqlAttempt | KeyAttempt;
// Omit must distribute over the union so each experiment retains its own inputs.
type WithoutMetadata<T> = T extends BaseAttempt ? Omit<T, keyof BaseAttempt> : never;
export type NewLabAttempt = WithoutMetadata<LabAttempt>;
const modes: SqlMode[] = ['not-equal', 'not-equal-or-null', 'not-equal-negated', 'not-in'];
const validValue = (v: unknown): v is SqlValue => v === null || typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e9;
const validTimestamp = (value: unknown): value is string => typeof value === 'string'
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

export function readLabAttempts(raw: string | null, sourceHash: string): LabAttempt[] {
  try {
    if (!/^[a-f0-9]{64}$/i.test(sourceHash)) return [];
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a): a is LabAttempt => {
      if (!a || a.schemaVersion !== 1 || a.sourceHash !== sourceHash || typeof a.id !== 'string'
        || !/^[\w-]{1,100}$/.test(a.id) || !validTimestamp(a.createdAt)) return false;
      if (a.kind === 'sql') return Array.isArray(a.values) && a.values.length >= 1 && a.values.length <= 6 && a.values.every(validValue)
        && validValue(a.target) && a.target !== null && modes.includes(a.mode) && Array.isArray(a.list) && a.list.length >= 1 && a.list.length <= 8 && a.list.every(validValue)
        && Array.isArray(a.prediction) && a.prediction.length === a.values.length && a.prediction.every((p: unknown) => typeof p === 'boolean');
      if (a.kind === 'keys') {
        const schema = LAB_SCHEMAS.find(s => s.id === a.schemaId);
        return !!schema && Array.isArray(a.selected) && a.selected.length <= schema.universe.length && new Set(a.selected).size === a.selected.length
          && a.selected.every((v: unknown) => typeof v === 'string' && schema.universe.includes(v))
          && ['candidate', 'superkey-only', 'not-superkey'].includes(a.prediction);
      }
      return false;
    }).slice(-100).map(a => {
      // Keep inputs and predictions only. Stored scores, results, source labels,
      // or arbitrary extra properties never become trusted export evidence.
      const base: BaseAttempt = {id: a.id, createdAt: a.createdAt, sourceHash: a.sourceHash, schemaVersion: 1};
      return a.kind === 'sql'
        ? {...base, kind: 'sql', values: [...a.values], target: a.target, mode: a.mode, list: [...a.list], prediction: [...a.prediction]}
        : {...base, kind: 'keys', schemaId: a.schemaId, selected: [...a.selected], prediction: a.prediction};
    });
  } catch { return []; }
}

export const showValue = (v: SqlValue) => v === null ? 'NULL' : String(v);
export const showSet = (v: readonly string[]) => v.length ? `{${v.join(', ')}}` : '∅';
export function sqlExpression(mode: SqlMode, target: number, list: readonly SqlValue[]) {
  if (mode === 'not-in') return `value NOT IN (${list.map(showValue).join(', ')})`;
  if (mode === 'not-equal-negated') return `NOT (value = ${target})`;
  return `value <> ${target}${mode === 'not-equal-or-null' ? ' OR value IS NULL' : ''}`;
}

export function labReport(attempts: readonly LabAttempt[]): string {
  const lines = ['# TraceLearn — Counterexample Lab record', '',
    'Saved inputs and predictions, followed by deterministic recomputation. These are practice records, not a mastery score or evidence of learning gains.',
    'The bounded SQL truth model is differential-tested against SQLite; it is not an arbitrary SQL engine. Key traces are relative to the stated functional dependencies. No model-generated reasoning is used in these traces.', ''];
  for (const [i, a] of attempts.entries()) {
    lines.push(`## ${i + 1}. ${a.kind === 'sql' ? 'SQL three-valued logic' : 'Attribute closure and minimality'}`, `Record ID: ${a.id}`, `Experiment schema version: ${a.schemaVersion}`, `Time: ${a.createdAt}`, `Source SHA-256: ${a.sourceHash}`, '');
    if (a.kind === 'sql') {
      const rows = evaluateSqlRows(a.values, a.target, a.mode, a.list);
      lines.push(`Predicate: ${sqlExpression(a.mode, a.target, a.list)}`, '| Row | Value | Predicted kept | Truth | Actually kept |', '| --- | --- | --- | --- | --- |');
      rows.forEach((row, n) => lines.push(`| ${n + 1} | ${showValue(row.value)} | ${a.prediction[n]} | ${row.truth} | ${row.kept} |`));
      lines.push(`Prediction matches: ${rows.every((row, n) => row.kept === a.prediction[n])}`, 'Sources: null-comparison, null-where, null-logic, null-not-in', '');
    } else {
      const schema = LAB_SCHEMAS.find(s => s.id === a.schemaId)!;
      const result = analyzeKey(a.selected, schema.universe, schema.fds);
      const classification = result.isMinimal ? 'candidate' : result.isSuperkey ? 'superkey-only' : 'not-superkey';
      lines.push(`Schema: ${schema.title}`, `Dependencies: ${schema.fds.map(fd => `${showSet(fd.left)} -> ${showSet(fd.right)}`).join('; ')}`,
        `Selected: ${showSet(a.selected)}`, `Predicted: ${a.prediction}`, `Computed: ${classification}`, `Prediction matches: ${classification === a.prediction}`,
        `Closure: ${showSet(result.closure)}`, `Missing: ${showSet(result.missing)}`, `Removable attributes: ${showSet(result.removable)}`);
      result.steps.forEach(step => lines.push(`- ${showSet(step.rule.left)} -> ${showSet(step.rule.right)} adds ${showSet(step.added)}; closure now ${showSet(step.closure)}`));
      lines.push(`Sources: ${schema.sourceIds.join(', ')}`, '');
    }
  }
  return lines.join('\n');
}
