import test from 'node:test';
import assert from 'node:assert/strict';
import {questions,sections} from '../content/course.ts';
import {sourceForQuestion,transferForLab,labContextForQuestion,sourceForLab,defaultLabContext,type LabTransferContext} from '../src/lab-transfer.ts';

test('each Lab context routes to the matching original concept and its actual transfer sources',()=>{
  const cases:{context:LabTransferContext;concept:string;questionId:string}[]=[
    {context:{kind:'sql',mode:'not-equal'},concept:'SQL NULL',questionId:'null-t'},
    {context:{kind:'sql',mode:'not-equal-negated'},concept:'SQL NULL',questionId:'null-t'},
    {context:{kind:'sql',mode:'not-equal-or-null'},concept:'SQL NULL',questionId:'null-t'},
    {context:{kind:'sql',mode:'not-in'},concept:'NOT IN',questionId:'notin-t'},
    {context:{kind:'keys',schemaId:'closure-chain'},concept:'Attribute closure',questionId:'closure-t'},
    {context:{kind:'keys',schemaId:'prime-exception'},concept:'3NF vs BCNF',questionId:'bcnf-t'}
  ];
  for(const {context,concept,questionId} of cases){
    const destination=transferForLab(context),question=questions.find(item=>item.id===destination.questionId)!;
    assert.ok(question);assert.equal(question.id,questionId);assert.equal(question.kind,'transfer');assert.equal(question.concept,concept);
    assert.deepEqual(destination.sourceIds,question.sourceIds);
    assert.ok(destination.sourceIds.every(id=>sections.some(section=>section.id===id)));
  }
});
test('unknown experiment contexts cannot silently fall back to an unrelated transfer question',()=>{
  for(const context of [{kind:'keys',schemaId:'unknown'},{kind:'sql',mode:'arbitrary-sql'},{kind:'unknown'}]){
    assert.throws(()=>transferForLab(context as LabTransferContext),/supported Lab experiment/);
  }
});
test('question-to-Lab shortcuts select the relevant experiment and unsupported concepts have no shortcut',()=>{
  for(const prefix of ['null','notin','key','closure','bcnf'])for(const kind of ['d','t']){
    const id=`${prefix}-${kind}`,question=questions.find(item=>item.id===id)!;
    const context=labContextForQuestion(id)!;assert.ok(context);
    const next=questions.find(item=>item.id===transferForLab(context).questionId)!;
    assert.equal(next.concept,question.concept==='Candidate keys'?'Attribute closure':question.concept);
    assert.ok(sections.some(section=>section.id===sourceForLab(context)));
  }
  assert.deepEqual(labContextForQuestion('notin-d'),{kind:'sql',mode:'not-in'});
  assert.deepEqual(labContextForQuestion('bcnf-d'),{kind:'keys',schemaId:'prime-exception'});
  assert.equal(sourceForLab(labContextForQuestion('bcnf-d')!),'normal-example');
  assert.deepEqual(defaultLabContext,{kind:'sql',mode:'not-equal'});
  for(const id of [undefined,'fd-d','fd-t','count-d','generated-1','unknown'])assert.equal(labContextForQuestion(id),undefined);
});

test('every original question opens its own first source, including restored and sidebar selections',()=>{
  assert.equal(questions.length,20);
  for(const question of questions){
    assert.equal(sourceForQuestion(question.id),question.sourceIds[0],question.id);
  }
  for(const id of ['generated-123','unknown','toString','__proto__'])assert.equal(sourceForQuestion(id),undefined);
});
