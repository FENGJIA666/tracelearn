import {createHash} from 'node:crypto';
import type {Course,Question,Section} from '../content/course.ts';

type SavedQuestion = Pick<Question,'kind'|'prompt'|'options'|'correct'> & {quote?:string};
export type GeneratedPractice = Pick<Question,'concept'|'prompt'|'options'|'correct'|'explanation'|'sourceIds'> & {quote:string};
export type PracticePlan = {section:Section;quote:string;fingerprint:string;courseView:Course};
export class PracticePlanningError extends Error {
  constructor(message:string,public status=400){super(message);}
}
const normalize=(value:string)=>value.replace(/\s+/g,' ').trim();
export const quoteFingerprint=(quote:string)=>createHash('sha256').update(normalize(quote)).digest('hex');
const ignoredWords=new Set(['which','their','there','these','those','about','would','should','contains','including']);
function hasPracticeTarget(quote:string){
  return /non-NULL|NULL|UNKNOWN|TRUE|FALSE/.test(quote)
    || (quote.match(/\b[A-Za-z][A-Za-z-]{4,}\b/g)||[]).some(word=>!ignoredWords.has(word.toLowerCase()))
    || /[\u4e00-\u9fff]{2,8}/.test(quote);
}
function savedQuote(question:SavedQuestion){
  if(question.quote)return question.quote;
  const gap=question.prompt.split('\n\n').slice(1).join('\n\n');
  return gap.includes('_____')&&question.options[question.correct]
    ? gap.replace('_____',question.options[question.correct]) : '';
}
export function isPracticeUsed(existing:SavedQuestion[],quote:string){
  const fingerprint=quoteFingerprint(quote);
  return existing.some(question=>question.kind==='generated'&&quoteFingerprint(savedQuote(question))===fingerprint);
}
export function planPractice(course:Course,existing:SavedQuestion[],sectionId?:string):PracticePlan {
  const sections=sectionId===undefined?course.sections:course.sections.filter(section=>section.id===sectionId);
  if(!sections.length)throw new PracticePlanningError('The selected passage does not belong to this course. Choose a passage from the source pane.',400);
  const seen=new Set<string>();
  const candidates=sections.flatMap(section=>section.text.split(/(?<=[.!?。！？])\s*|\n+/)
    .map(text=>({section,quote:normalize(text)})))
    .filter(({quote})=>quote.length>=35&&quote.length<=300&&!quote.startsWith('#')&&!quote.includes('_____')&&hasPracticeTarget(quote))
    .filter(({quote})=>{const key=quoteFingerprint(quote);if(seen.has(key))return false;seen.add(key);return true;});
  if(!candidates.length)throw new PracticePlanningError('This selection needs a clear sentence of 35–300 characters with a phrase to practice. Choose another passage.',400);
  const used=new Set(existing.filter(question=>question.kind==='generated').map(question=>quoteFingerprint(savedQuote(question))));
  const selected=candidates.find(({quote})=>!used.has(quoteFingerprint(quote)));
  if(!selected)throw new PracticePlanningError(sectionId===undefined
    ? 'Every eligible sentence in this course already has a practice question. Revisit an existing question or import new material.'
    : 'Every eligible sentence in this passage already has a practice question. Choose another passage or revisit an existing question.',409);
  return {...selected,fingerprint:quoteFingerprint(selected.quote),courseView:{...course,sections:[{...selected.section,text:selected.quote,textZh:undefined,vector:undefined}]}};
}
export function validatePlannedPractice(plan:PracticePlan,generated:GeneratedPractice,original:Course):GeneratedPractice {
  const section=original.sections.find(item=>item.id===plan.section.id);
  const options=generated.options?.map(option=>option.trim());
  const gap=generated.prompt?.split('\n\n').slice(1).join('\n\n');
  if(!section||!normalize(section.text).includes(plan.quote)||normalize(generated.quote)!==plan.quote
    || generated.sourceIds.length!==1||generated.sourceIds[0]!==section.id
    || !options||options.length!==4||options.some(option=>!option)||new Set(options.map(option=>option.toLowerCase())).size!==4
    || !Number.isInteger(generated.correct)||generated.correct<0||generated.correct>3
    || !gap||gap.split('_____').length!==2||normalize(gap.replace('_____',options[generated.correct]))!==plan.quote){
    throw new PracticePlanningError('The generated exercise did not preserve the selected source sentence. No question was saved. Retry or choose another passage.',502);
  }
  // Keep the real document hash intact; distribute answer positions by the selected quote instead.
  const correct=parseInt(plan.fingerprint.slice(0,2),16)%4;
  const key=options[generated.correct];
  const reordered=options.filter((_option,index)=>index!==generated.correct);
  reordered.splice(correct,0,key);
  return {...generated,quote:plan.quote,options:reordered,correct};
}
export function ensureUnusedPractice(existing:SavedQuestion[],generated:GeneratedPractice){
  if(isPracticeUsed(existing,generated.quote)||existing.some(question=>question.kind==='generated'&&normalize(question.prompt)===normalize(generated.prompt))){
    throw new PracticePlanningError('This source sentence already has a practice question, possibly from another request. No duplicate was saved. Choose another passage or retry.',409);
  }
}
