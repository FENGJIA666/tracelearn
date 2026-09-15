import test from 'node:test';
import assert from 'node:assert/strict';
import type {Section} from '../content/course.ts';
import {sections as builtInSections} from '../content/course.ts';
import {EvidenceQuoteError,quoteChoices,resolveEvidenceIds} from '../server/evidence-quotes.ts';

const section=(text:string,id='p1'):Section=>({id,title:'Evidence source',page:1,text});
function verifyCoverage(text:string){
 const choices=quoteChoices([section(text)]),covered=new Set<number>();
 for(const choice of choices){
  assert.equal(choice.quote,text.slice(choice.start,choice.end));
  assert.equal(choice.quote,choice.quote.trim());
  assert.ok(choice.quote.length<=500);
  assert.ok(choice.quote.replace(/\s+/gu,' ').trim().length>=8);
  for(let i=choice.start;i<choice.end;i++)covered.add(i);
  // UTF-16 is only checked at excerpt boundaries, preserving original content.
  assert.ok(!(choice.start>0&&/[\uDC00-\uDFFF]/u.test(text[choice.start])&&/[\uD800-\uDBFF]/u.test(text[choice.start-1])));
  assert.ok(!(choice.end<text.length&&/[\uD800-\uDBFF]/u.test(text[choice.end-1])&&/[\uDC00-\uDFFF]/u.test(text[choice.end])));
 }
 for(let i=0;i<text.length;i++)if(!/\s/u.test(text[i]))assert.ok(covered.has(i),`uncovered source offset ${i}`);
 return choices;
}

test('a short section is one unchanged trimmed substring with original offsets',()=>{
 const text=' \n  The first value is 120.\nThe second value is 240. \n';
 const choices=quoteChoices([section(text),section('Another complete source statement.','p2')]);
 assert.deepEqual(choices[0],{id:'E1',sectionId:'p1',quote:text.trim(),start:4,end:text.length-2});
 assert.equal(choices[1].id,'E2');
 assert.deepEqual(resolveEvidenceIds(['E1'],choices),[{sectionId:'p1',quote:text.trim()}]);
});

test('long prose keeps every original non-whitespace character and prefers sentence boundaries',()=>{
 const text=Array.from({length:30},(_,i)=>`Record ${i} has a precise value and a complete condition.`).join(' ');
 const choices=verifyCoverage(text);
 assert.ok(choices.length>3);
 for(const choice of choices.slice(0,-1))assert.ok(choice.quote.endsWith('.'));
});

test('every built-in course passage retains all source characters in literal bounded excerpts',()=>{
 for(const original of builtInSections)verifyCoverage(original.text);
 for(let offset=0;offset<builtInSections.length;offset+=5){
  const retrieved=builtInSections.slice(offset,offset+5);
  for(const choice of quoteChoices(retrieved)){
   const original=retrieved.find(source=>source.id===choice.sectionId)!;
   assert.equal(choice.quote,original.text.slice(choice.start,choice.end));
  }
 }
});

test('unbroken text uses bounded 32-character overlap and preserves a short tail',()=>{
 const text='x'.repeat(500)+'END!';
 const choices=verifyCoverage(text);
 assert.equal(choices.length,2);
 assert.equal(choices[0].end-choices[1].start,32);
 assert.ok(choices[1].quote.endsWith('END!'));
});

test('Chinese and emoji remain literal with no split surrogate pairs',()=>{
 for(const text of ['数据库中的空值不等于零。🙂'.repeat(80),'x'.repeat(499)+'😀'+'文'.repeat(600)+'🚀结尾','😀'.repeat(600)+'短尾'])verifyCoverage(text);
 const emojis=quoteChoices([section('😀'.repeat(600))]);
 assert.equal([...('😀'.repeat(600)).slice(emojis[1].start,emojis[0].end)].length,32);
});

test('word boundaries are preferred when a long paragraph has no sentence punctuation',()=>{
 const text='source phrase '.repeat(90)+'last';
 const choices=verifyCoverage(text);
 assert.ok(choices.slice(0,-1).every(choice=>/\s/u.test(text[choice.end])));
});

test('blank or entirely short sections have no choices, and the retrieval limit is enforced',()=>{
 assert.deepEqual(quoteChoices([section(' \n\t '),section('  short  ','p2'),section(' a   b  c ','p3')]),[]);
 assert.throws(()=>quoteChoices(Array.from({length:6},(_,i)=>section('A complete original source.',`p${i}`))),/at most five/);
 assert.throws(()=>quoteChoices([section('A complete original source.'),section('A different complete source.')]),/unique/);
});

test('evidence selection deduplicates IDs and rejects empty, invented and excessive selections',()=>{
 const choices=quoteChoices(['First evidence statement.','Second evidence statement.','Third evidence statement.'].map((text,i)=>section(text,`p${i}`)));
 assert.deepEqual(resolveEvidenceIds(['E2','E2','E1'],choices),[{sectionId:'p1',quote:'Second evidence statement.'},{sectionId:'p0',quote:'First evidence statement.'}]);
 for(const ids of [[],[''],[' E1 '],['E0'],['E99'],['E1','E2','E3']])assert.throws(()=>resolveEvidenceIds(ids,choices));
 assert.throws(()=>resolveEvidenceIds([{sectionId:'p0',quote:'Fabricated quotation'}] as unknown as string[],choices),/valid evidence IDs/);
});

test('widely separated isolated short text fails explicitly instead of losing source characters',()=>{
 assert.throws(()=>quoteChoices([section('A complete opening sentence.'+' '.repeat(1000)+'x')]),/isolated text too short/);
});

test('unusable source excerpts are recoverable 400 errors, but invalid model IDs remain validation failures',()=>{
 assert.throws(()=>quoteChoices([section('A complete opening sentence.'+' '.repeat(1000)+'x')]),error=>{
  assert.ok(error instanceof EvidenceQuoteError);
  assert.equal(error.status,400);
  assert.match(error.message,/Remove very large blank gaps or import clearer paragraphs, then retry/);
  return true;
 });
 const choices=quoteChoices([section('A complete original source.')]);
 assert.throws(()=>resolveEvidenceIds(['E99'],choices),error=>{
  assert.ok(error instanceof Error);
  assert.equal(error instanceof EvidenceQuoteError,false);
  assert.equal('status' in error,false);
  return true;
 });
});
