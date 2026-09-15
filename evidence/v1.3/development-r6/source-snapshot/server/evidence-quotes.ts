import type {Section} from '../content/course.ts';

export type EvidenceChoice={id:string;sectionId:string;quote:string;start:number;end:number};
export class EvidenceQuoteError extends Error{
 readonly status=400;
 constructor(message:string){super(message);this.name='EvidenceQuoteError';}
}
const MAX_QUOTE=500,OVERLAP=32,MIN_NORMALIZED=8;
const normalizedLength=(text:string)=>text.replace(/\s+/gu,' ').trim().length;
const whitespace=(text:string)=>/\s/u.test(text);
const highSurrogate=(code:number)=>code>=0xd800&&code<=0xdbff;
const lowSurrogate=(code:number)=>code>=0xdc00&&code<=0xdfff;
const splitsPair=(text:string,index:number)=>index>0&&index<text.length&&highSurrogate(text.charCodeAt(index-1))&&lowSurrogate(text.charCodeAt(index));

function trimmedRange(text:string,start:number,end:number){
 while(start<end&&whitespace(text[start]))start++;
 while(end>start&&whitespace(text[end-1]))end--;
 return{start,end};
}

/** Offsets use String.slice's UTF-16 units; valid surrogate pairs stay together. */
function previousCharacters(text:string,end:number,count:number,minimum:number){
 let start=end;
 for(let i=0;i<count&&start>minimum;i++){
  start--;
  if(start>minimum&&lowSurrogate(text.charCodeAt(start))&&highSurrogate(text.charCodeAt(start-1)))start--;
 }
 return start;
}

function naturalEnd(text:string,start:number,maximum:number){
 const fragment=text.slice(start,maximum),minimum=Math.floor(MAX_QUOTE/2);
 let sentence=0,word=0;
 // Prefer complete sentences/paragraphs, then words; do not split decimal dots.
 const ends=/(?:[.!?]["'”’»）)\]】]*(?=\s|$)|[。！？；;]["'”’»）)\]】]*|\n[ \t]*\n)/gu;
 for(const match of fragment.matchAll(ends))if(match.index+match[0].length>=minimum)sentence=match.index+match[0].length;
 if(sentence)return start+sentence;
 for(const match of fragment.matchAll(/\s+/gu))if(match.index+match[0].length>=minimum)word=match.index+match[0].length;
 return word?start+word:maximum;
}

/** Enumerate literal excerpts from at most the five passages supplied by retrieval. */
export function quoteChoices(sections:Section[]):EvidenceChoice[]{
 if(sections.length>5)throw Error('Evidence choices accept at most five retrieved sections.');
 if(new Set(sections.map(section=>section.id)).size!==sections.length)throw Error('Retrieved section IDs must be unique.');
 const choices:EvidenceChoice[]=[];
 for(const section of sections){
  const text=section.text,whole=trimmedRange(text,0,text.length);
  if(normalizedLength(text)<MIN_NORMALIZED)continue;
  let start=whole.start;
  while(start<whole.end){
   while(start<whole.end&&whitespace(text[start]))start++;
   if(start===whole.end)break;
   let maximum=Math.min(start+MAX_QUOTE,whole.end);
   if(splitsPair(text,maximum))maximum--;
   const end=maximum===whole.end?maximum:naturalEnd(text,start,maximum);
   let range=trimmedRange(text,start,end);
   if(normalizedLength(text.slice(range.start,range.end))<MIN_NORMALIZED){
    // A tiny final tail still needs its preceding context, even after whitespace.
    let earlier=Math.max(whole.start,range.end-MAX_QUOTE);
    if(splitsPair(text,earlier))earlier++;
    range=trimmedRange(text,earlier,range.end);
    if(normalizedLength(text.slice(range.start,range.end))<MIN_NORMALIZED)throw new EvidenceQuoteError(`Section ${section.id} contains isolated text too short for a complete evidence excerpt. Remove very large blank gaps or import clearer paragraphs, then retry.`);
   }
   choices.push({id:`E${choices.length+1}`,sectionId:section.id,quote:text.slice(range.start,range.end),...range});
   if(end===whole.end)break;
   const overlappingStart=previousCharacters(text,end,OVERLAP,start);
   if(overlappingStart<=start)throw Error('Evidence chunking could not make progress.');
   start=overlappingStart;
  }
 }
 return choices;
}

/** The model selects IDs only; quotation text comes exclusively from the choices. */
export function resolveEvidenceIds(ids:string[],choices:EvidenceChoice[]):{sectionId:string;quote:string}[]{
 if(!Array.isArray(ids)||!ids.length||ids.some(id=>typeof id!=='string'||!/^E[1-9]\d*$/u.test(id)))throw Error('Select one or two valid evidence IDs.');
 const selected=[...new Set(ids)];
 if(selected.length>2)throw Error('Select at most two distinct evidence IDs.');
 const byId=new Map(choices.map(choice=>[choice.id,choice]));
 if(byId.size!==choices.length)throw Error('Evidence choice IDs must be unique.');
 return selected.map(id=>{
  const choice=byId.get(id);
  if(!choice)throw Error(`Unknown evidence ID: ${id}.`);
  return{sectionId:choice.sectionId,quote:choice.quote};
 });
}
