/** A narrow quality check for wording-recall options, not a semantic answer grader. */
export class PracticeOptionQualityError extends Error {
  readonly status=502;
  readonly code='PRACTICE_OPTION_QUALITY';
  constructor(public readonly reason:'duplicate-option'|'ambiguous-sql-alias'){
    super(reason==='duplicate-option'
      ? 'Generated practice options repeat the same wording. Generate new options.'
      : 'Generated practice options contain equivalent SQL non-NULL wording. Generate new options.');
    this.name='PracticeOptionQualityError';
  }
}

function wordingKey(value:string):string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
}
function sqlAlias(value:string):string|undefined {
  // Backticks can wrap a displayed term. Do not remove SQL string/identifier quotes,
  // or canonicalize larger statements where the surrounding text changes meaning.
  let term=wordingKey(value);
  if(/^`[^`]+`$/.test(term))term=term.slice(1,-1).trim();
  if(/^non[ \-‐‑‒–—−]*null$/.test(term)
    || /^not null$/.test(term)
    || /^is not null$/.test(term))return 'sql:non-null';
  return undefined;
}

/**
 * Reject repeated wording and one explicitly enumerated SQL alias family.
 * A passing result does not establish that distractors are false or pedagogically good.
 * Call before saving, and bound regeneration in the caller.
 */
export function assertDistinctPracticeOptions(options:readonly string[]):void {
  const wording=new Set<string>(),aliases=new Set<string>();
  for(const option of options){
    const key=wordingKey(option);
    if(wording.has(key))throw new PracticeOptionQualityError('duplicate-option');
    wording.add(key);
    const alias=sqlAlias(option);
    if(alias){
      if(aliases.has(alias))throw new PracticeOptionQualityError('ambiguous-sql-alias');
      aliases.add(alias);
    }
  }
}
