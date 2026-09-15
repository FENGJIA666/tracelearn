import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const all = process.argv.includes('--all');
if (process.argv.slice(2).some(arg => !['--all', '--development'].includes(arg))) throw Error('Use --development or --all.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const lock = read('dataset-lock.json');
const verified = [];
for (const file of lock.files.filter(file => all || !file.path.startsWith('holdout-sealed/'))) {
  const bytes = readFileSync(join(root, file.path));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha(bytes), file.sha256, file.path);
  verified.push({path: file.path, sha256: file.sha256});
}
const documents = read('documents.json');
assert.equal(documents.length, 4);
for (const document of documents) {
  const {hash, ...withoutHash} = document;
  assert.equal(sha(JSON.stringify(canonical(withoutHash))), hash, document.id);
  assert.equal(document.sections.length, 7);
}
const splits = all ? ['development', 'holdout'] : ['development'];
const summary = {};
const questions = new Set();
for (const split of splits) {
  const rows = read(split === 'development' ? 'development.json' : 'holdout-sealed/questions.json');
  const review = read(split === 'development' ? 'development-author-review.json' : 'holdout-sealed/author-review.json');
  assert.equal(rows.length, 40); assert.equal(review.length, 40);
  const categories = {}, languages = {}, sources = {};
  for (const row of rows) {
    assert.equal(row.split, split);
    assert.ok(!questions.has(row.question), 'Duplicate question'); questions.add(row.question);
    const document = documents.find(d => d.id === row.documentId);
    assert.ok(document); assert.equal(row.documentHash, document.hash);
    assert.ok(row.reference.length > 0 && row.requiredFacts.length > 0);
    assert.ok(row.supportIds.every(id => document.sections.some(section => section.id === id)));
    assert.equal(row.expectedInsufficient, row.category === 'unanswerable');
    assert.equal(row.supportIds.length === 0, row.expectedInsufficient);
    assert.ok(review.some(item => item.id === row.id && item.rationale.length > 0));
    categories[row.category] = (categories[row.category] || 0) + 1;
    languages[row.language] = (languages[row.language] || 0) + 1;
    sources[row.documentId] = (sources[row.documentId] || 0) + 1;
  }
  assert.deepEqual(categories, {'source-answerable': 16, unanswerable: 12, 'contradicted-premise': 12});
  assert.deepEqual(languages, {en: 20, zh: 20});
  assert.ok(Object.values(sources).every(count => count === 10));
  summary[split] = {count: rows.length, categories, languages};
}
console.log(JSON.stringify({verified: true, scope: all ? 'custodian-all-splits' : 'public-development-only', summary, files: verified}, null, 2));
