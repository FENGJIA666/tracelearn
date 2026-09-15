import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {questions,sections} from '../content/course.ts';
import {gradePortable,readPortableAttempts,portableReport} from '../src/portable-store.ts';
import {reviewPlan} from '../src/review-plan.ts';

test('portable exercises use every original key and preserve source provenance',()=>{
  const hash=createHash('sha256').update(JSON.stringify(sections)).digest('hex');
  for(const q of questions)for(let chosen=0;chosen<4;chosen++){
    const r=gradePortable({questionId:q.id,chosen,confidence:'sure'});
    assert.equal(r.isCorrect,chosen===q.correct);assert.equal(r.explanation,q.explanation);
    assert.deepEqual(r.sourceIds,q.sourceIds);assert.equal(r.sourceHash,hash);
  }
  assert.equal(gradePortable({questionId:'null-d',chosen:0,confidence:'unsure'}).options[0],'200 only');
  for(const bad of [{questionId:'nope',chosen:0,confidence:'sure'},{questionId:'null-d',chosen:5,confidence:'sure'},{questionId:'null-d',chosen:0,confidence:'invalid'}])assert.throws(()=>gradePortable(bad));
});
test('portable restoration repairs altered grading fields and tolerates corrupted storage',()=>{
  const r=gradePortable({questionId:'null-d',chosen:1,confidence:'sure'});
  const restored=readPortableAttempts(JSON.stringify([{...r,isCorrect:true,explanation:'edited'},null,{questionId:'missing'}]));
  assert.equal(restored.length,1);assert.equal(restored[0].isCorrect,false);assert.equal(restored[0].id,r.id);assert.equal(restored[0].confidence,'sure');
  assert.deepEqual(readPortableAttempts('broken JSON'),[]);assert.deepEqual(readPortableAttempts('{}'),[]);
  const report=portableReport(restored);assert.match(report,/200 and NULL/);assert.match(report,/not live inference/);assert.match(report,/Needs review/);
});
test('review plan puts current confident mistakes first and untried transfer next',()=>{
  const attempts=[{questionId:'null-d',isCorrect:false,confidence:'sure'},{questionId:'count-d',isCorrect:true,confidence:'somewhat'}];
  const validCount=questions.find(q=>q.kind==='diagnostic'&&q.id!=='null-d')!;attempts[1].questionId=validCount.id;
  const plan=reviewPlan(questions,attempts);assert.equal(plan[0].reason,'confident-mistake');assert.equal(plan[0].questionId,'null-d');assert.equal(plan[1].questionId,validCount.pairedId);
  const after=reviewPlan(questions,[...attempts,{questionId:'null-d',isCorrect:true,confidence:'sure'},{questionId:'null-t',isCorrect:true,confidence:'sure'}]);
  assert.ok(after.every(p=>p.concept!=='SQL NULL'));assert.deepEqual(reviewPlan(questions,[]),[]);
});
test('evidence viewer contains every frozen record, failure and unmodified answer',()=>{
  const raw=readFileSync('evaluation/raw-results.jsonl','utf8');const original=raw.trim().split('\n').map(l=>JSON.parse(l));
  const view=JSON.parse(readFileSync('src/generated/review-data.json','utf8'));
  assert.equal(view.rawSha256,createHash('sha256').update(raw).digest('hex'));
  assert.equal(view.records.length,160);assert.equal(view.dataset.length,80);assert.equal(view.reviews.length,80);
  for(const row of original){const r=view.records.find((x:any)=>x.id===row.id&&x.mode===row.mode);assert.ok(r);for(const k of ['ok','answer','error','elapsedMs','citations','insufficient'])assert.deepEqual(r[k],row[k]);for(const s of row.sources||[])assert.equal(sections.find(t=>t.id===s.id)?.text,s.text)}
  assert.equal(view.records.filter((r:any)=>!r.ok).length,original.filter(r=>!r.ok).length);
});
test('portable artifact embeds script and style and denies network connections',()=>{
  const html=readFileSync('submission/TraceLearn-Portable.html','utf8');
  assert.match(html,/connect-src 'none'/);assert.match(html,/<style>[\s\S]+<\/style>/);assert.match(html,/<script>[\s\S]+<\/script>/);
  assert.doesNotMatch(html,/<script\b[^>]*\bsrc\s*=/i);assert.doesNotMatch(html,/<link\b[^>]*rel=["']stylesheet/i);
  assert.ok(Buffer.byteLength(html)<1_000_000);assert.equal(/(?:\/\/[#@]\s*sourceMappingURL=|\/\*# sourceMappingURL=)/.test(html),false);
});
