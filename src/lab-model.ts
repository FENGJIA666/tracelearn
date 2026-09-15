/** Deterministic teaching models for a fixed SQL subset and functional dependencies.
 * This module does not parse or execute arbitrary SQL and does not call an AI model.
 */
export type SqlValue = number | null;
export type Truth = 'TRUE' | 'FALSE' | 'UNKNOWN';
export type SqlMode = 'not-equal' | 'not-equal-or-null' | 'not-equal-negated' | 'not-in';
export type SqlRowResult = {value: SqlValue; truth: Truth; kept: boolean};

export function truthNot(value: Truth): Truth {
  return value === 'UNKNOWN' ? 'UNKNOWN' : value === 'TRUE' ? 'FALSE' : 'TRUE';
}

export function truthAnd(left: Truth, right: Truth): Truth {
  if (left === 'FALSE' || right === 'FALSE') return 'FALSE';
  return left === 'UNKNOWN' || right === 'UNKNOWN' ? 'UNKNOWN' : 'TRUE';
}

export function truthOr(left: Truth, right: Truth): Truth {
  if (left === 'TRUE' || right === 'TRUE') return 'TRUE';
  return left === 'UNKNOWN' || right === 'UNKNOWN' ? 'UNKNOWN' : 'FALSE';
}

export function sqlEqual(left: SqlValue, right: SqlValue): Truth {
  return left === null || right === null ? 'UNKNOWN' : left === right ? 'TRUE' : 'FALSE';
}

function requireSqlValue(value: SqlValue): void {
  if (value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error('Use a finite number or NULL in the SQL experiment.');
  }
}

/**
 * Preserves row order and duplicates. WHERE keeps only TRUE.
 * not-equal-negated means NOT(value = target), not NOT(value <> target).
 * An empty NOT IN list returns TRUE, including for NULL, as SQLite specifies.
 */
export function evaluateSqlRows(
  values: readonly SqlValue[], target: number, mode: SqlMode,
  list: readonly SqlValue[] = [target, null]
): SqlRowResult[] {
  if (typeof target !== 'number' || !Number.isFinite(target)) {
    throw new Error('Use a finite comparison target in the SQL experiment.');
  }
  if (!['not-equal', 'not-equal-or-null', 'not-equal-negated', 'not-in'].includes(mode)) {
    throw new Error('Choose a supported SQL experiment.');
  }
  values.forEach(requireSqlValue);
  list.forEach(requireSqlValue);
  return values.map(value => {
    const unequal = truthNot(sqlEqual(value, target));
    const truth = mode === 'not-equal-or-null'
      ? truthOr(unequal, value === null ? 'TRUE' : 'FALSE')
      : mode === 'not-in'
        ? list.reduce<Truth>((result, item) => truthAnd(result, truthNot(sqlEqual(value, item))), 'TRUE')
        : unequal;
    return {value, truth, kept: truth === 'TRUE'};
  });
}

export type FD = {left: readonly string[]; right: readonly string[]};
export type ClosureStep = {rule: FD; added: string[]; closure: string[]};
export type ClosureResult = {closure: string[]; steps: ClosureStep[]};
export type KeyAnalysis = ClosureResult & {
  isSuperkey: boolean; isMinimal: boolean; removable: string[]; missing: string[];
};

function attributes(values: readonly string[]): string[] {
  if (values.some(value => typeof value !== 'string' || !value.trim())) {
    throw new Error('Attribute names must be nonempty strings.');
  }
  return [...new Set(values)].sort();
}

/** Adds only newly derived attributes, retaining an inspectable snapshot per rule. */
export function closureTrace(selected: readonly string[], fds: readonly FD[]): ClosureResult {
  const closure = new Set(attributes(selected));
  const rules = fds.map(rule => ({left: attributes(rule.left), right: attributes(rule.right)}));
  const steps: ClosureStep[] = [];
  let changed: boolean;
  do {
    changed = false;
    for (const rule of rules) {
      if (!rule.left.every(attribute => closure.has(attribute))) continue;
      const added = rule.right.filter(attribute => !closure.has(attribute));
      if (!added.length) continue;
      added.forEach(attribute => closure.add(attribute));
      steps.push({rule, added, closure: [...closure].sort()});
      changed = true;
    }
  } while (changed);
  return {closure: [...closure].sort(), steps};
}

/**
 * Candidate-key minimality is inclusion minimality. For a superkey, checking
 * every single-attribute removal is sufficient by monotonicity of closure.
 * removable is empty for non-superkeys: removing an attribute cannot make a key.
 */
export function analyzeKey(
  selected: readonly string[], universe: readonly string[], fds: readonly FD[]
): KeyAnalysis {
  const all = attributes(universe);
  const chosen = attributes(selected);
  const known = new Set(all);
  const referenced = [...chosen, ...fds.flatMap(rule => [...rule.left, ...rule.right])];
  if (referenced.some(attribute => !known.has(attribute))) {
    throw new Error('Every selected and dependency attribute must belong to the relation.');
  }
  const result = closureTrace(chosen, fds);
  const missing = all.filter(attribute => !result.closure.includes(attribute));
  const isSuperkey = missing.length === 0;
  const removable = isSuperkey ? chosen.filter(attribute => {
    const reduced = closureTrace(chosen.filter(value => value !== attribute), fds).closure;
    return all.every(value => reduced.includes(value));
  }) : [];
  return {...result, isSuperkey, isMinimal: isSuperkey && removable.length === 0, removable, missing};
}

export type LabSchema = {
  readonly id: string;
  readonly title: string;
  readonly titleZh: string;
  readonly description: string;
  readonly descriptionZh: string;
  readonly universe: readonly string[];
  readonly fds: readonly FD[];
  readonly sourceIds: readonly string[];
  readonly initialSelection: readonly string[];
};

function immutableSchema(schema: LabSchema): LabSchema {
  return Object.freeze({...schema,
    universe: Object.freeze([...schema.universe]),
    fds: Object.freeze(schema.fds.map(rule => Object.freeze({
      left: Object.freeze([...rule.left]), right: Object.freeze([...rule.right])
    }))),
    sourceIds: Object.freeze([...schema.sourceIds]),
    initialSelection: Object.freeze([...schema.initialSelection])
  });
}

export const LAB_SCHEMAS: readonly LabSchema[] = Object.freeze([
  immutableSchema({
    id: 'closure-chain', title: 'A missing attribute changes the key', titleZh: '缺少一个属性，键就不同了',
    description: 'R(A, B, C, D), with A → B and B → C. Can your selection reach every attribute, and can any selected attribute be removed?',
    descriptionZh: 'R(A, B, C, D)，满足 A → B、B → C。所选属性能否推导全部属性？能否删去任何一个？',
    universe: ['A', 'B', 'C', 'D'], fds: [{left: ['A'], right: ['B']}, {left: ['B'], right: ['C']}],
    sourceIds: ['closure', 'keys'], initialSelection: ['A']
  }),
  immutableSchema({
    id: 'prime-exception', title: 'Why Instructor is not a superkey', titleZh: '为什么 Instructor 不是超键',
    description: 'R(S, C, I): Student, Course, Instructor. SC → I and I → C. Compare I, SC, SI and SCI using the same closure and minimality rules.',
    descriptionZh: 'R(S, C, I)：学生、课程、讲师。SC → I、I → C。用相同的闭包与最小性规则比较 I、SC、SI、SCI。',
    universe: ['S', 'C', 'I'], fds: [{left: ['S', 'C'], right: ['I']}, {left: ['I'], right: ['C']}],
    sourceIds: ['normal-example', 'third-normal', 'bcnf', 'keys'], initialSelection: ['I']
  })
]);
