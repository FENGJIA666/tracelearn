import test from 'node:test';
import assert from 'node:assert/strict';
import {
  labReport, readLabAttempts, showSet, showValue, sqlExpression,
  type KeyAttempt, type LabAttempt, type NewLabAttempt, type SqlAttempt
} from '../src/lab-history.ts';

const sourceHash = 'a'.repeat(64);
const otherHash = 'b'.repeat(64);
const base = {schemaVersion: 1 as const, sourceHash, createdAt: '2026-09-15T12:34:56.789Z'};
const sql: SqlAttempt = {...base, id: 'sql-1', kind: 'sql', values: [100, 200, null], target: 100,
  mode: 'not-equal', list: [100, null], prediction: [false, true, true]};
const key: KeyAttempt = {...base, id: 'key-1', kind: 'keys', schemaId: 'closure-chain',
  selected: ['A'], prediction: 'candidate'};
const restore = (records: unknown[]) => readLabAttempts(JSON.stringify(records), sourceHash);

test('saved SQL and key predictions round-trip in order and retain source provenance', () => {
  const records = restore([sql, key]);
  assert.deepEqual(records, [sql, key]);
  const report = labReport(records);
  assert.match(report, /Record ID: sql-1/);
  assert.match(report, /Experiment schema version: 1/);
  assert.match(report, /Time: 2026-09-15T12:34:56\.789Z/);
  assert.equal(report.split(`Source SHA-256: ${sourceHash}`).length - 1, 2);
  assert.match(report, /\| 3 \| NULL \| true \| UNKNOWN \| false \|/);
  assert.match(report, /Predicted: candidate\nComputed: not-superkey\nPrediction matches: false/);
  assert.match(report, /Closure: \{A, B, C\}\nMissing: \{D\}/);
  assert.match(report, /\{A\} -> \{B\} adds \{B\}; closure now \{A, B\}/);
  assert.match(report, /\{B\} -> \{C\} adds \{C\}; closure now \{A, B, C\}/);
  assert.match(report, /not a mastery score or evidence of learning gains/);
});

test('history is isolated by exact source hash and cannot accept foreign or missing provenance', () => {
  assert.deepEqual(restore([sql, {...key, sourceHash: otherHash}]), [sql]);
  assert.deepEqual(readLabAttempts(JSON.stringify([sql, {...key, sourceHash: otherHash}]), otherHash), [{...key, sourceHash: otherHash}]);
  for (const hash of ['', 'not-a-hash', 'a'.repeat(63), 'x'.repeat(64)]) {
    assert.deepEqual(readLabAttempts(JSON.stringify([{...sql, sourceHash: hash}]), hash), []);
  }
  assert.deepEqual(restore([{...sql, sourceHash: null}, {...sql, sourceHash: undefined}]), []);
});

test('malformed storage and metadata are rejected without losing adjacent valid records', () => {
  for (const raw of [null, '', '{', 'null', '{}', '42', '"value"']) assert.deepEqual(readLabAttempts(raw, sourceHash), []);
  const invalid = [null, false, 42, 'record', {},
    {...sql, schemaVersion: 2}, {...sql, schemaVersion: '1'},
    {...sql, id: ''}, {...sql, id: 'x'.repeat(101)}, {...sql, id: 'record\n# fake heading'},
    {...sql, createdAt: 2026}, {...sql, createdAt: null}, {...sql, createdAt: 'yesterday'},
    {...sql, createdAt: '2026\n'}, {...sql, createdAt: '2026-02-30T12:34:56.789Z'},
    {...sql, kind: 'fake'}
  ];
  assert.deepEqual(restore([sql, ...invalid, key]), [sql, key]);
});

test('SQL history checks finite bounded inputs, supported modes and one prediction per row', () => {
  const invalid = [
    {...sql, values: []}, {...sql, values: Array(7).fill(1)}, {...sql, values: ['NULL', 200, null]},
    {...sql, values: [1e10, 200, null]}, {...sql, target: null}, {...sql, target: '100'}, {...sql, target: 1e10},
    {...sql, mode: 'DROP TABLE'}, {...sql, list: []}, {...sql, list: Array(9).fill(1)}, {...sql, list: ['100']},
    {...sql, list: [1e10]}, {...sql, prediction: [false]}, {...sql, prediction: [false, true, 1]}
  ];
  assert.deepEqual(restore([sql, ...invalid]), [sql]);
  assert.deepEqual(readLabAttempts(JSON.stringify([sql]).replace('"target":100', '"target":1e999'), sourceHash), []);
  const edge: SqlAttempt = {...sql, values: [-1e9, 1e9, null], target: -1e9, list: [null, -1e9, 1e9]};
  assert.deepEqual(restore([edge]), [edge]);
});

test('key history permits the empty set but rejects unknown schemas, duplicate and foreign attributes', () => {
  const empty: KeyAttempt = {...key, selected: [], prediction: 'not-superkey'};
  const invalid = [
    {...key, schemaId: 'unknown'}, {...key, selected: ['Z']}, {...key, selected: ['A', 'A']},
    {...key, selected: [null]}, {...key, selected: 'A'}, {...key, prediction: 'mastered'},
    {...key, selected: ['A', 'B', 'C', 'D', 'E']}
  ];
  assert.deepEqual(restore([empty, ...invalid, key]), [empty, key]);
  const report = labReport([empty]);
  assert.match(report, /Selected: ∅/);
  assert.match(report, /Closure: ∅/);
  assert.match(report, /Computed: not-superkey/);
});

test('stored grades and computed traces are discarded; every exported result is recomputed', () => {
  const tamperedSql = {...sql, isCorrect: true, truth: 'TRUE', score: 100, predictionMatches: true,
    rows: [{value: null, truth: 'TRUE', kept: true}], sourceIds: ['invented-source'], answer: 'perfect'};
  const tamperedKey = {...key, isSuperkey: true, isMinimal: true, classification: 'candidate',
    closure: ['A', 'B', 'C', 'D'], missing: [], score: 100, steps: ['fabricated']};
  const records = restore([tamperedSql, tamperedKey]);
  assert.deepEqual(records, [sql, key]);
  const report = labReport(records);
  assert.equal(report.split('Prediction matches: false').length - 1, 2);
  assert.match(report, /\| 3 \| NULL \| true \| UNKNOWN \| false \|/);
  assert.match(report, /Computed: not-superkey/);
  assert.doesNotMatch(report, /invented-source|fabricated|score: 100|perfect/);
  // The exporter itself also ignores fabricated derived fields on otherwise valid typed inputs.
  assert.equal(labReport([tamperedSql, tamperedKey] as LabAttempt[]), report);
});

test('history retains the latest 100 valid records in input order', () => {
  const records = Array.from({length: 105}, (_, i) => ({...sql, id: `sql-${i}`}));
  const restored = restore([...records, {...sql, id: 'invalid', target: null}]);
  assert.equal(restored.length, 100);
  assert.equal(restored[0].id, 'sql-5');
  assert.equal(restored.at(-1)?.id, 'sql-104');
  assert.equal(labReport(restored).match(/^## /gm)?.length, 100);
});

test('exports distinguish candidate keys from reducible superkeys and show both schemas', () => {
  const candidate: KeyAttempt = {...key, id: 'candidate', selected: ['A', 'D']};
  const reducible: KeyAttempt = {...key, id: 'reducible', selected: ['A', 'B', 'D'], prediction: 'superkey-only'};
  const prime: KeyAttempt = {...key, id: 'prime', schemaId: 'prime-exception', selected: ['S', 'I']};
  assert.match(labReport([candidate]), /Computed: candidate\nPrediction matches: true/);
  assert.match(labReport([candidate]), /Removable attributes: ∅/);
  assert.match(labReport([reducible]), /Computed: superkey-only\nPrediction matches: true/);
  assert.match(labReport([reducible]), /Removable attributes: \{B\}/);
  const primeReport = labReport([prime]);
  assert.match(primeReport, /Computed: candidate/);
  assert.match(primeReport, /Dependencies: \{S, C\} -> \{I\}; \{I\} -> \{C\}/);
  assert.match(primeReport, /Sources: normal-example, third-normal, bcnf, keys/);
});

test('display helpers preserve SQL negation meaning and new-attempt union retains variant-specific inputs', () => {
  assert.equal(showValue(null), 'NULL'); assert.equal(showValue(0), '0');
  assert.equal(showSet([]), '∅'); assert.equal(showSet(['A', 'D']), '{A, D}');
  assert.equal(sqlExpression('not-equal-negated', 100, []), 'NOT (value = 100)');
  assert.equal(sqlExpression('not-equal', -1, []), 'value <> -1');
  assert.equal(sqlExpression('not-equal-or-null', 0, []), 'value <> 0 OR value IS NULL');
  assert.equal(sqlExpression('not-in', 0, [1, null]), 'value NOT IN (1, NULL)');
  const sqlDraft: NewLabAttempt = {kind: 'sql', values: [null], target: 0, mode: 'not-equal', list: [0], prediction: [false]};
  const keyDraft: NewLabAttempt = {kind: 'keys', schemaId: 'closure-chain', selected: ['A'], prediction: 'not-superkey'};
  assert.equal(sqlDraft.kind, 'sql'); assert.equal(keyDraft.kind, 'keys');
});
