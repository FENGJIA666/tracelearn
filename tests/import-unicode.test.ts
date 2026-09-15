import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import type {Course} from '../content/course.ts';

const temporary=mkdtempSync(join(tmpdir(),'tracelearn-import-unicode-'));
process.env.TRACELEARN_DATA=temporary;
const {importDocument}=await import('../server/import.ts');
const {db}=await import('../server/store.ts');
after(()=>{db.close();rmSync(temporary,{recursive:true,force:true});});

const unpairedSurrogate=/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
const nonWhitespace=(text:string)=>text.replace(/\s/g,'');
function assertPreserved(course:Course,original:string){
  for(const section of course.sections){
    assert.equal(unpairedSurrogate.test(section.text),false,`Unpaired surrogate in ${section.id}`);
    assert.equal(unpairedSurrogate.test(section.title),false,`Unpaired surrogate in ${section.id} title`);
  }
  assert.equal(nonWhitespace(course.sections.map(section=>section.text).join('')),nonWhitespace(original));
}

test('TXT and Markdown preserve emoji crossing virtual-page and paragraph cuts',async()=>{
  for(const extension of ['txt','md'])for(const boundary of [1400,2800,3500,4900,7000]){
    const text='a'.repeat(boundary-1)+'😀'+'b'.repeat(1500);
    const buffer=Buffer.from(text);
    const course=await importDocument(`boundary.${extension}`,buffer);
    assertPreserved(course,text);
    assert.equal(course.hash,createHash('sha256').update(buffer).digest('hex'));
  }
});

test('word-boundary trimming and title truncation keep valid emoji without changing source characters',async()=>{
  const texts=[
    '# '+'a'.repeat(74)+'🧠'+'b'.repeat(1500),
    'prefix '.repeat(130)+'😀'+'x'.repeat(800)+'\n\n'+'汉字 🧠 '.repeat(300),
    '🧑‍💻 '.repeat(650)
  ];
  for(const text of texts)assertPreserved(await importDocument('unicode.md',Buffer.from(text)),text);
});

test('valid text at 175000 UTF-16 units stays within 50 virtual pages despite repeated boundary emoji',async()=>{
  // An emoji crosses every nominal page boundary. Moving each cut backwards
  // without preserving the original page grid would create an unwanted page 51.
  const text='a'.repeat(3499)+'😀'+('a'.repeat(3498)+'😀').repeat(48)+'a'.repeat(3499);
  assert.equal(text.length,175000);
  const course=await importDocument('limit.txt',Buffer.from(text));
  assertPreserved(course,text);
  assert.equal(Math.max(...course.sections.map(section=>section.page)),50);
  assert.equal(course.sections.filter(section=>section.page===1).map(section=>section.text).join(''),'a'.repeat(3499)+'😀');
  await assert.rejects(()=>importDocument('too-long.txt',Buffer.from(text+'a')),/175,000/);
});

test('normal text keeps its original sections, page numbers, ids and titles',async()=>{
  const ascii=await importDocument('ascii.txt',Buffer.from('x'.repeat(6000)));
  assert.deepEqual(ascii.sections.map(section=>({id:section.id,page:section.page,length:section.text.length,title:section.title})),[
    {id:'p1-1',page:1,length:1400,title:'x'.repeat(75)},
    {id:'p1-2',page:1,length:1400,title:'x'.repeat(75)},
    {id:'p1-3',page:1,length:700,title:'x'.repeat(75)},
    {id:'p2-4',page:2,length:1400,title:'x'.repeat(75)},
    {id:'p2-5',page:2,length:1100,title:'x'.repeat(75)}
  ]);
  const notes='# Lesson\n\nA candidate key is a minimal superkey.';
  const short=await importDocument('notes.md',Buffer.from(notes));
  assert.deepEqual(short.sections,[{id:'p1-1',title:'Lesson',page:1,text:notes}]);
});

// A tiny text PDF uses a ToUnicode map to supply a real supplementary-plane
// character, without downloading a font or mocking PDF.js extraction.
function emojiPdf(){
  const cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /FixtureUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n3 beginbfchar\n<0001> <0041>\n<0002> <D83DDE00>\n<0003> <0042>\nendbfchar\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
  const content='BT /F1 0.1 Tf 10 100 Td <'+'0001'.repeat(1399)+'0002'+'0003'.repeat(60)+'> Tj ET';
  const stream=(text:string)=>`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`;
  const objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 8 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /UnicodeFixture /Encoding /Identity-H /DescendantFonts [5 0 R] /ToUnicode 6 0 R >>',
    '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /UnicodeFixture /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 7 0 R /DW 500 >>',
    stream(cmap),
    '<< /Type /FontDescriptor /FontName /UnicodeFixture /Flags 32 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 >>',
    stream(content)
  ];
  let pdf='%PDF-1.7\n';const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(pdf);
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('');
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

test('real PDF text extraction preserves emoji across the shared paragraph boundary',async()=>{
  const course=await importDocument('unicode.pdf',emojiPdf());
  assertPreserved(course,'A'.repeat(1399)+'😀'+'B'.repeat(60));
  assert.equal(course.sections.length,2);
  assert.ok(course.sections.every(section=>section.page===1));
});

test('existing byte and PDF-page limits remain enforced',async()=>{
  await assert.rejects(()=>importDocument('oversized.txt',Buffer.alloc(10*1024*1024+1,97)),/10 MB/);
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);
  for(let page=0;page<50;page++)pdf.addPage().drawText('Readable original source text on this page.',{font});
  const accepted=await importDocument('fifty.pdf',Buffer.from(await pdf.save()));
  assert.equal(Math.max(...accepted.sections.map(section=>section.page)),50);
  pdf.addPage().drawText('Readable original source text on the extra page.',{font});
  await assert.rejects(async()=>importDocument('fifty-one.pdf',Buffer.from(await pdf.save())),/50 pages/);
});
