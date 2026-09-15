import {randomUUID} from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {AppError} from './ai.ts';
import {hash} from './store.ts';
import type {Course,Section} from '../content/course.ts';
// Keep both UTF-16 units of a supplementary character on the same side of a cut.
function wholeCharacterEnd(text:string,boundary:number){
 const end=Math.min(boundary,text.length),before=text.charCodeAt(end-1),after=text.charCodeAt(end);
 return before>=0xD800&&before<=0xDBFF&&after>=0xDC00&&after<=0xDFFF?end+1:end;
}
export async function importDocument(name:string,buffer:Buffer):Promise<Course>{
 if(!buffer.length)throw new AppError('The file is empty.');if(buffer.length>10*1024*1024)throw new AppError('Maximum file size is 10 MB.',413);
 const ext=name.split('.').pop()?.toLowerCase();const pages:string[]=[];
 if(ext==='pdf'){let doc;let task;try{task=getDocument({data:new Uint8Array(buffer),useSystemFonts:true});doc=await task.promise;if(doc.numPages>50)throw new AppError('Maximum document length is 50 pages.');for(let p=1;p<=doc.numPages;p++){const content=await(await doc.getPage(p)).getTextContent();pages.push(content.items.map(i=>'str'in i?i.str+('hasEOL'in i&&i.hasEOL?'\n':' '):'').join(''));}}catch(e){if(e instanceof AppError)throw e;throw new AppError('This PDF cannot be read. Use an unencrypted text PDF, Markdown, or TXT file.');}finally{await task?.destroy();}if(pages.some(t=>t.trim().length<10))throw new AppError('This PDF contains a page without readable text. Scanned or mixed scanned PDFs need OCR before import.');}
 else if(ext==='md'||ext==='txt'){
  const text=buffer.toString('utf8');if(text.includes('\u0000')||text.includes('\uFFFD'))throw new AppError('Use a UTF-8 text file.');
  if(text.length>175000)throw new AppError('Text is too long (maximum 175,000 characters).');
  // Anchor cuts to the original page grid so boundary adjustments cannot add
  // an extra virtual page to a valid near-limit document.
  let start=0;for(let boundary=3500;start<text.length;boundary+=3500){const end=wholeCharacterEnd(text,boundary);pages.push(text.slice(start,end));start=end;}
 }
 else throw new AppError('Supported formats: text PDF, Markdown, TXT.');
 if(pages.join('').trim().length<20)throw new AppError('Add at least 20 readable characters.');
 const sections:Section[]=[];for(let p=0;p<pages.length;p++){const chunks:string[]=[];let rest=pages[p];while(rest.length){let end=Math.min(1400,rest.length);if(end<rest.length){const boundary=rest.lastIndexOf(' ',end);if(boundary>700)end=boundary+1;}end=wholeCharacterEnd(rest,end);chunks.push(rest.slice(0,end));rest=rest.slice(end);}for(const chunk of chunks){const text=chunk.trim();if(text){const title=text.split('\n')[0].replace(/^#+\s*/,'');sections.push({id:`p${p+1}-${sections.length+1}`,title:title.slice(0,wholeCharacterEnd(title,75)),page:p+1,text});}}}
 return{id:randomUUID(),title:name.replace(/\.[^.]+$/,''),subtitle:ext==='pdf'?'Your local source document':'Your local notes · page numbers are virtual text segments',builtin:false,hash:hash(buffer),createdAt:new Date().toISOString(),sections};
}
