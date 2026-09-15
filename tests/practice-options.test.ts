import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDistinctPracticeOptions,PracticeOptionQualityError} from '../server/practice-options.ts';

const rejects=(options:string[],reason:string)=>assert.throws(()=>assertDistinctPracticeOptions(options),error=>error instanceof PracticeOptionQualityError&&error.code==='PRACTICE_OPTION_QUALITY'&&error.status===502&&error.reason===reason);

test('rejects the known non-NULL alias ambiguity, regardless of answer position',()=>{
  const aliases=['non-NULL','non NULL','not null','IS NOT NULL','`non-NULL`','non‑NULL','NON–NULL','non   null'];
  for(const alias of aliases.slice(1)){
    rejects(['non-NULL',alias,'UNKNOWN','NULL'],'ambiguous-sql-alias');
    rejects(['NULL','UNKNOWN',alias,'non-NULL'],'ambiguous-sql-alias');
  }
  rejects(['TRUE','not NULL','FALSE','IS NOT NULL'],'ambiguous-sql-alias');
});

test('rejects duplicate wording after Unicode, case and whitespace normalization',()=>{
  rejects(['UNKNOWN','unknown','NULL','TRUE'],'duplicate-option');
  rejects(['candidate key','candidate   key','superkey','primary key'],'duplicate-option');
  rejects(['ＮＵＬＬ','NULL','TRUE','FALSE'],'duplicate-option');
});

test('retains distinct SQL concepts and does not invent a general synonym grader',()=>{
  for(const options of [
    ['non-NULL','NULL','UNKNOWN','TRUE'],
    ['non-NULL','nontrivial NULL','nonempty NULL','nonnegative NULL'],
    ['candidate key','primary key','superkey','foreign key'],
    ['FALSE','UNKNOWN','NULL','TRUE'],
    ['not null','not nullable','nullable','null values'],
    ['NULL','IS NULL','NULL = NULL','NULL IS NULL'],
    ['not null','NOT (value IS NULL)','value IS NOT NULL','nullable'],
    ['non-NULL',"'not null'",'"IS NOT NULL"','UNKNOWN']
  ])assert.doesNotThrow(()=>assertDistinctPracticeOptions(options));
});
