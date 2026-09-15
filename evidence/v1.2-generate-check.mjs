import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base = 'http://127.0.0.1:4337';
const fixture = new URL('./v1.2-generation-source.md', import.meta.url);
mkdirSync(new URL('../.local/', import.meta.url), {recursive:true});
const output = new URL(`../.local/v12-live-repeat-${Date.now()}.json`, import.meta.url);
const evidence = {kind: 'real-model-selected-passage-acceptance', startedAt: new Date().toISOString(),
  server: base, isolatedDataDirectory: 'Provided by the separately started server; not inferred by this client', requests: [], checks: [], completed: false};
const persist = () => writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
async function request(path, body, multipart = false) {
  const sentAt = new Date().toISOString();
  const started = performance.now();
  const entry = {request: {method: body ? 'POST' : 'GET', url: base + path,
    body: multipart ? {file: 'evidence/v1.2-generation-source.md', sha256: evidence.fixtureSha256, utf8: readFileSync(fixture, 'utf8')} : body ?? null}, sentAt};
  evidence.requests.push(entry); persist();
  try {
    const response = await fetch(base + path, {method: body ? 'POST' : 'GET',
      headers: multipart ? undefined : {'Content-Type': 'application/json'},
      body: multipart ? body : body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(245000)});
    const text = await response.text();
    entry.latencyMs = Math.round((performance.now() - started) * 100) / 100;
    entry.response = {status: response.status, text, json: JSON.parse(text)};
    persist();
    console.log(JSON.stringify({path, status: response.status, latencyMs: entry.latencyMs}));
    return entry.response;
  } catch (error) {
    entry.latencyMs = Math.round((performance.now() - started) * 100) / 100;
    entry.error = String(error); persist(); throw error;
  }
}
try {
  const bytes = readFileSync(fixture);
  evidence.fixtureSha256 = createHash('sha256').update(bytes).digest('hex');
  evidence.fixturePath = 'evidence/v1.2-generation-source.md';
  const status = await request('/api/status'); assert.equal(status.status, 200); assert.equal(status.json.ready, true);
  const identity = await request('/api/identity'); evidence.identity = identity.json;
  const form = new FormData();
  form.append('file', new Blob([bytes], {type: 'text/markdown'}), 'TraceLearn-selected-passage-live-check.md');
  const imported = await request('/api/import', form, true); assert.equal(imported.status, 201);
  const course = imported.json;
  assert.equal(course.hash, evidence.fixtureSha256); assert.ok(course.sections.length >= 7);
  const selected = course.sections[6];
  assert.equal(selected.id, 'p3-7');
  const quotes = ['Ordinary comparisons involving a missing SQL value evaluate to UNKNOWN.',
    'COUNT(column) counts only non-NULL observations in the selected column.'];
  assert.ok(quotes.every(quote => selected.text.includes(quote)));
  evidence.course = {id: course.id, title: course.title, hash: course.hash, sectionCount: course.sections.length, selected};
  evidence.checks.push({name: 'original file hash and seventh imported source passage', passed: true}); persist();
  const generatedIds = [];
  const actualQuotes = [];
  for (let i = 0; i < 2; i++) {
    const generated = await request('/api/generate-question', {courseId: course.id, language: 'en', sectionId: selected.id});
    assert.equal(generated.status, 200);
    const q = generated.json;
    assert.equal(q.courseId, course.id); assert.equal(q.kind, 'generated');
    assert.equal('correct' in q, false); assert.equal('explanation' in q, false);
    const gap = q.prompt.split('\n\n').slice(1).join('\n\n');
    const matches = q.options.map((option, chosen) => ({chosen, quote: gap.replace('_____', option)})).filter(x => quotes.includes(x.quote));
    assert.equal(matches.length, 1); assert.equal(matches[0].quote, quotes[i]);
    const attempt = await request('/api/attempt', {questionId: q.id, chosen: matches[0].chosen, confidence: 'somewhat'});
    assert.equal(attempt.status, 200); assert.equal(attempt.json.isCorrect, true);
    assert.deepEqual(attempt.json.sourceIds, [selected.id]); assert.equal(attempt.json.sourceHash, evidence.fixtureSha256);
    assert.equal(attempt.json.explanation, 'The original source states: ' + quotes[i]);
    actualQuotes.push(matches[0].quote); generatedIds.push(q.id);
    evidence.checks.push({name: `real generation ${i+1}: distinct exact source sentence, hidden key, correct grounding and deterministic grade`,
      passed: true, questionId: q.id, quote: matches[0].quote, sourceId: selected.id, sourceHash: attempt.json.sourceHash}); persist();
  }
  assert.equal(new Set(actualQuotes).size, 2); assert.equal(new Set(generatedIds).size, 2);
  const exhausted = await request('/api/generate-question', {courseId: course.id, language: 'en', sectionId: selected.id});
  assert.equal(exhausted.status, 409); assert.match(exhausted.json.error, /Every eligible sentence in this passage/);
  const listed = await request(`/api/courses/${course.id}/questions`); assert.equal(listed.status, 200);
  assert.equal(listed.json.length, 2); assert.deepEqual(listed.json.map(q => q.id), generatedIds);
  evidence.checks.push({name: 'third request returns 409 without saving a duplicate', passed: true});
  const history = await request(`/api/courses/${course.id}/history`); assert.equal(history.status, 200);
  assert.equal(history.json.attempts.length, 2); assert.ok(history.json.attempts.every(a => a.sourceHash === course.hash));
  evidence.checks.push({name: 'two genuine attempt records persist in isolated SQLite history', passed: true});
  evidence.completed = true;
} catch (error) {
  evidence.failure = String(error); console.error(error); process.exitCode = 1;
} finally {
  evidence.finishedAt = new Date().toISOString(); persist();
  console.log(JSON.stringify({completed: evidence.completed, file: output, course: evidence.course, failure: evidence.failure}));
}
