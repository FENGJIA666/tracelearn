import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sections} from '../content/course.ts';

// A lossless display projection of each answer, not a new evaluation or rescoring.
const raw = readFileSync('evaluation/raw-results.jsonl', 'utf8');
const records = raw.trim().split('\n').map(line => JSON.parse(line));
const dataset = JSON.parse(readFileSync('evaluation/dataset.json', 'utf8'));
const review = JSON.parse(readFileSync('evaluation/semantic-review.json', 'utf8'));
const keep = ['id','split','category','mode','ok','answer','error','insufficient','citations','elapsedMs','model','quizCorrect','extractedLetter'];
const data = {
  provenance: 'Frozen v1.0 answer pipeline; recorded 14 September 2026. Not live AI inference.',
  rawSha256: createHash('sha256').update(raw).digest('hex'),
  courseHash: createHash('sha256').update(JSON.stringify(sections)).digest('hex'),
  dataset,
  records: records.map(r => ({...Object.fromEntries(keep.filter(k => k in r).map(k => [k,r[k]])), sourceIds: (r.sources || []).map((s: {id:string}) => s.id)})),
  reviews: [...review.items, ...review.unanswerableReview.items],
  summary: JSON.parse(readFileSync('evaluation/summary.json', 'utf8'))
};
if (records.length !== 160 || dataset.length !== 80) throw new Error('Expected the complete frozen run.');
mkdirSync('src/generated', {recursive:true});
writeFileSync('src/generated/review-data.json', JSON.stringify(data));
console.log(`Prepared all ${records.length} recorded outputs for inspection.`);
