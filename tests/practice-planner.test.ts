import test from 'node:test';
import assert from 'node:assert/strict';
import type {Course,Question} from '../content/course.ts';
import {planPractice,validatePlannedPractice,ensureUnusedPractice,type GeneratedPractice} from '../server/practice-planner.ts';

const sentence='The late passage explains why a candidate key must be minimal.';
const course:Course={id:'planner-fixture',title:'Original planner fixture',subtitle:'',hash:'a'.repeat(64),builtin:false,createdAt:'2026-09-15',sections:[...Array.from({length:6},(_v,index)=>({id:`short-${index}`,title:'Short',page:index+1,text:'Too short.'})),{id:'late',title:'Late material',page:7,text:sentence+' Each attribute in a minimal key is necessary for identifying every tuple.'}]};
function generated(quote:string,sectionId='late'):GeneratedPractice {
  const target=quote.includes('minimal')?'minimal':'tuple';
  return {concept:'Source recall',quote,prompt:'Complete the exact statement.\n\n'+quote.replace(target,'_____'),options:[target,'optional','redundant','unknown'],correct:0,explanation:'The original source states: '+quote,sourceIds:[sectionId]};
}
function saved(value:GeneratedPractice):Question&{quote:string}{return {...value,id:'saved-fixture',courseId:course.id,kind:'generated',misconceptions:['','','','']};}

test('practice planner reaches eligible material beyond the first five passages without altering provenance',()=>{
  const plan=planPractice(course,[]);
  assert.equal(plan.section.id,'late');assert.equal(plan.quote,sentence);
  assert.equal(plan.courseView.hash,course.hash);assert.equal(plan.courseView.sections.length,1);
  assert.equal(plan.courseView.sections[0].id,'late');assert.equal(plan.courseView.sections[0].page,7);
  assert.equal(plan.courseView.sections[0].text,sentence);assert.equal(course.sections[6].text.includes('Each attribute'),true);
  const result=validatePlannedPractice(plan,generated(plan.quote),course);
  assert.equal(result.options[result.correct],'minimal');assert.deepEqual(result.sourceIds,['late']);
  assert.equal(result.prompt.split('\n\n')[1].replace('_____',result.options[result.correct]),sentence);
});
test('selected-passage generation progresses, detects legacy cloze records, and reports exhaustion',()=>{
  const first=planPractice(course,[],'late');
  const q=saved(generated(first.quote));
  const {quote:_quote,...legacy}=q;
  const next=planPractice(course,[legacy],'late');
  assert.notEqual(next.quote,first.quote);
  assert.throws(()=>planPractice(course,[q,saved(generated(next.quote))],'late'),(error:any)=>error.status===409&&/already has/.test(error.message));
  assert.throws(()=>planPractice(course,[],'missing'),(error:any)=>error.status===400&&/does not belong/.test(error.message));
  assert.throws(()=>planPractice(course,[],'short-0'),(error:any)=>error.status===400&&/35–300/.test(error.message));
});
test('planned practice rejects altered source references, quotes and incorrect keys',()=>{
  const plan=planPractice(course,[],'late'),valid=generated(plan.quote);
  for(const changed of [{...valid,quote:'An invented statement.'},{...valid,sourceIds:['short-0']},{...valid,correct:1},{...valid,prompt:valid.prompt+' false'}]){
    assert.throws(()=>validatePlannedPractice(plan,changed,course),(error:any)=>error.status===502);
  }
  assert.throws(()=>ensureUnusedPractice([saved(valid)],valid),(error:any)=>error.status===409);
});
