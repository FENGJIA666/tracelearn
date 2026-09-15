import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {sections} from '../content/course.ts';
import {
  evaluateSqlRows, truthAnd, truthOr, truthNot, sqlEqual,
  closureTrace, analyzeKey, LAB_SCHEMAS,
  type FD, type SqlMode, type SqlValue, type Truth
} from '../src/lab-model.ts';

function fromSql(value: unknown): Truth {
  assert.ok(value === null || value === 0 || value === 1);
  return value === null ? 'UNKNOWN' : value === 1 ? 'TRUE' : 'FALSE';
}

test('SQL experiment matches real SQLite for NULL, signed numbers, duplicates and varied NOT IN lists', () => {
  const db = new Database(':memory:');
  const values: SqlValue[] = [null, -10, -1, -0, 0, 0.5, 1, 10, null, 1];
  const lists: SqlValue[][] = [[], [null], [0], [-1, 1], [1, null], [null, 1, null], [0, 0, -10], [0.5, 10]];
  const modes: SqlMode[] = ['not-equal', 'not-equal-or-null', 'not-equal-negated', 'not-in'];
  try {
    for (const target of [-10, 0, 0.5, 1, 100]) {
      for (const mode of modes) {
        for (const list of lists) {
          const actual = evaluateSqlRows(values, target, mode, list);
          const expected = values.map(value => {
            const statement = mode === 'not-equal' ? 'SELECT (? <> ?) AS truth'
              : mode === 'not-equal-or-null' ? 'SELECT ((? <> ?) OR (? IS NULL)) AS truth'
                : mode === 'not-equal-negated' ? 'SELECT (NOT (? = ?)) AS truth'
                  : `SELECT (? NOT IN (${list.map(() => '?').join(',')})) AS truth`;
            const bindings = mode === 'not-equal-or-null' ? [value, target, value]
              : mode === 'not-in' ? [value, ...list] : [value, target];
            const result = db.prepare(statement).get(...bindings) as {truth: number | null};
            const truth = fromSql(result.truth);
            return {value, truth, kept: truth === 'TRUE'};
          });
          assert.deepEqual(actual, expected, `${mode}; target=${target}; list=${JSON.stringify(list)}`);
        }
      }
    }
    assert.deepEqual(evaluateSqlRows([null, 0], 0, 'not-in', []), [
      {value: null, truth: 'TRUE', kept: true}, {value: 0, truth: 'TRUE', kept: true}
    ]);
    assert.deepEqual(evaluateSqlRows([1, 2, null], 1, 'not-in'), [
      {value: 1, truth: 'FALSE', kept: false}, {value: 2, truth: 'UNKNOWN', kept: false},
      {value: null, truth: 'UNKNOWN', kept: false}
    ]);
    assert.deepEqual(evaluateSqlRows([], 0, 'not-equal'), []);
  } finally { db.close(); }
});

test('every three-valued Boolean truth-table entry matches SQLite', () => {
  const db = new Database(':memory:');
  const values: SqlValue[] = [0, 1, null];
  try {
    for (const left of values) {
      const not = db.prepare('SELECT NOT ? AS result').get(left) as {result: SqlValue};
      assert.equal(truthNot(fromSql(left)), fromSql(not.result));
      for (const right of values) {
        const result = db.prepare('SELECT (? AND ?) AS both, (? OR ?) AS either, (? = ?) AS equal')
          .get(left, right, left, right, left, right) as {both: SqlValue; either: SqlValue; equal: SqlValue};
        assert.equal(truthAnd(fromSql(left), fromSql(right)), fromSql(result.both));
        assert.equal(truthOr(fromSql(left), fromSql(right)), fromSql(result.either));
        assert.equal(sqlEqual(left, right), fromSql(result.equal));
      }
    }
  } finally { db.close(); }
});

test('SQL model rejects malformed numeric inputs and does not mutate callers', () => {
  const values = Object.freeze<SqlValue[]>([null, -1, 0, 1]);
  const list = Object.freeze<SqlValue[]>([1, null]);
  evaluateSqlRows(values, 0, 'not-in', list);
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => evaluateSqlRows([value], 0, 'not-equal'), /finite/);
    assert.throws(() => evaluateSqlRows([0], value, 'not-equal'), /finite/);
    assert.throws(() => evaluateSqlRows([0], 0, 'not-in', [value]), /finite/);
  }
  assert.throws(() => evaluateSqlRows(['NULL' as unknown as SqlValue], 0, 'not-equal'), /finite/);
  assert.throws(() => evaluateSqlRows([0], 0, 'arbitrary SQL' as SqlMode), /supported/);
});

function subsets(universe: readonly string[]): string[][] {
  return Array.from({length: 2 ** universe.length}, (_, mask) =>
    universe.filter((_, index) => (mask & (1 << index)) !== 0));
}

/** Independent finite-model oracle: enumerate every pair of binary tuples that
 * satisfies the FDs. X determines A exactly when no such pair agrees on X but
 * disagrees on A. For FDs, a two-tuple counterexample suffices; no closure
 * algorithm is used here.
 */
function impliedByLegalPairs(selected: readonly string[], universe: readonly string[], fds: readonly FD[]): string[] {
  const tuples = subsets(universe).map(ones => Object.fromEntries(universe.map(a => [a, ones.includes(a) ? 1 : 0])));
  const possible = new Set(universe);
  for (const a of tuples) for (const b of tuples) {
    const agrees = (attributes: readonly string[]) => attributes.every(attribute => a[attribute] === b[attribute]);
    if (!fds.every(fd => !agrees(fd.left) || agrees(fd.right)) || !agrees(selected)) continue;
    for (const attribute of universe) if (a[attribute] !== b[attribute]) possible.delete(attribute);
  }
  return [...possible].sort();
}

test('all subsets of both schemas agree with an independent two-tuple FD oracle', () => {
  for (const schema of LAB_SCHEMAS) {
    for (const chosen of subsets(schema.universe)) {
      const expectedClosure = impliedByLegalPairs(chosen, schema.universe, schema.fds);
      const expectedKey = expectedClosure.length === schema.universe.length;
      const properSubsets = subsets(chosen).filter(subset => subset.length < chosen.length);
      const expectedMinimal = expectedKey && properSubsets.every(subset =>
        impliedByLegalPairs(subset, schema.universe, schema.fds).length < schema.universe.length);
      const result = analyzeKey(chosen, schema.universe, schema.fds);
      assert.deepEqual(result.closure, expectedClosure, `${schema.id}: ${chosen}`);
      assert.equal(result.isSuperkey, expectedKey, `${schema.id}: ${chosen}`);
      assert.equal(result.isMinimal, expectedMinimal, `${schema.id}: ${chosen}`);
      assert.deepEqual(result.missing, schema.universe.filter(a => !expectedClosure.includes(a)).sort());
      assert.deepEqual(result.removable, expectedKey ? chosen.filter(a =>
        impliedByLegalPairs(chosen.filter(x => x !== a), schema.universe, schema.fds).length === schema.universe.length).sort() : []);
      // Independently replay each trace and verify no derived attribute appears without a usable FD.
      const reached = new Set(chosen);
      for (const step of result.steps) {
        assert.ok(step.rule.left.every(attribute => reached.has(attribute)));
        assert.ok(step.added.length > 0);
        assert.deepEqual(step.added, step.rule.right.filter(a => !reached.has(a)));
        step.added.forEach(attribute => reached.add(attribute));
        assert.deepEqual(step.closure, [...reached].sort());
      }
      assert.deepEqual([...reached].sort(), result.closure);
    }
  }
});

test('closure handles reordered rules, cycles, repeated inputs and empty determinants', () => {
  const fds: FD[] = [{left: ['B'], right: ['C']}, {left: ['A'], right: ['B']}, {left: ['C'], right: ['A']}];
  const result = closureTrace(['A', 'A'], fds);
  assert.deepEqual(result.closure, ['A', 'B', 'C']);
  assert.deepEqual(result.steps.map(step => step.added), [['B'], ['C']]);
  assert.deepEqual(result.steps.map(step => step.closure), [['A', 'B'], ['A', 'B', 'C']]);
  assert.deepEqual(closureTrace([], [{left: [], right: ['A']}]).closure, ['A']);
  assert.equal(analyzeKey([], ['A'], [{left: [], right: ['A']}]).isMinimal, true);
  assert.equal(analyzeKey([], [], []).isMinimal, true);
  assert.deepEqual(analyzeKey(['A', 'B'], ['A', 'B'], []).removable, []);
  assert.equal(analyzeKey(['A', 'A'], ['A'], []).isMinimal, true);
  assert.throws(() => analyzeKey(['Z'], ['A'], []), /belong/);
  assert.throws(() => analyzeKey(['A'], ['A'], [{left: ['A'], right: ['Z']}]), /belong/);
  assert.throws(() => closureTrace([''], []), /nonempty/);
  // A returned trace cannot accidentally edit the caller's dependency lists.
  fds[1].right = ['D'];
  assert.deepEqual(result.steps[0].rule.right, ['B']);
});

test('lab schemas are deeply immutable and link only to existing original source passages', () => {
  assert.equal(LAB_SCHEMAS.length, 2);
  assert.ok(Object.isFrozen(LAB_SCHEMAS));
  for (const schema of LAB_SCHEMAS) {
    assert.ok(Object.isFrozen(schema));
    for (const list of [schema.universe, schema.fds, schema.sourceIds, schema.initialSelection]) assert.ok(Object.isFrozen(list));
    assert.ok(schema.sourceIds.every(id => sections.some(section => section.id === id)));
    for (const rule of schema.fds) {
      assert.ok(Object.isFrozen(rule)); assert.ok(Object.isFrozen(rule.left)); assert.ok(Object.isFrozen(rule.right));
    }
  }
});
