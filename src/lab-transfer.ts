import type {SqlMode} from './lab-model';

/** Keep transfer practice on the concept actually explored in the Lab. */
export type LabTransferContext =
  | {kind:'sql'; mode:SqlMode}
  | {kind:'keys'; schemaId:string};
export type LabTransferTarget = {readonly questionId:string; readonly sourceIds:readonly string[]};

function target(questionId:string,sourceIds:string[]):LabTransferTarget {
  return Object.freeze({questionId,sourceIds:Object.freeze(sourceIds)});
}
const nullTransfer=target('null-t',['null-where','null-logic']);
const notInTransfer=target('notin-t',['null-not-in','null-logic']);
const closureTransfer=target('closure-t',['closure','keys']);
const primeExceptionTransfer=target('bcnf-t',['third-normal','bcnf']);

export const defaultLabContext:LabTransferContext=Object.freeze({kind:'sql',mode:'not-equal'});

/** Only expose a Lab shortcut when its model can explore this question's concept. */
export function labContextForQuestion(questionId?:string):LabTransferContext|undefined {
  if(questionId&&/^notin-/.test(questionId))return {kind:'sql',mode:'not-in'};
  if(questionId&&/^null-/.test(questionId))return {kind:'sql',mode:'not-equal'};
  if(questionId&&/^bcnf-/.test(questionId))return {kind:'keys',schemaId:'prime-exception'};
  if(questionId&&/^(key|closure)-/.test(questionId))return {kind:'keys',schemaId:'closure-chain'};
  return undefined;
}

export function sourceForLab(context:LabTransferContext):string {
  transferForLab(context);
  return context.kind==='sql' ? context.mode==='not-in'?'null-not-in':'null-where'
    : context.schemaId==='prime-exception'?'normal-example':'closure';
}

/** Uses existing original-course questions; it neither creates nor grades items. */
export function transferForLab(context:LabTransferContext):LabTransferTarget {
  if(context.kind==='sql'){
    if(context.mode==='not-in')return notInTransfer;
    if(['not-equal','not-equal-negated','not-equal-or-null'].includes(context.mode))return nullTransfer;
  }else if(context.kind==='keys'){
    if(context.schemaId==='closure-chain')return closureTransfer;
    if(context.schemaId==='prime-exception')return primeExceptionTransfer;
  }
  throw new Error('Choose a supported Lab experiment before opening its transfer question.');
}

/** Navigation-only source IDs; no answer keys are exposed by this map. */
const questionSources:Readonly<Record<string,string>>=Object.freeze({
  'null-d':'null-comparison','null-t':'null-where',
  'count-d':'null-count','count-t':'null-count',
  'notin-d':'null-not-in','notin-t':'null-not-in',
  'key-d':'keys','key-t':'keys',
  'fd-d':'fd-definition','fd-t':'fd-definition',
  'closure-d':'closure','closure-t':'closure',
  '2nf-d':'second-normal','2nf-t':'second-normal',
  'bcnf-d':'third-normal','bcnf-t':'third-normal',
  'lossless-d':'lossless','lossless-t':'preservation',
  'join-d':'join-filter','join-t':'join-filter'
});
export function sourceForQuestion(questionId:string):string|undefined {
  return Object.hasOwn(questionSources,questionId)?questionSources[questionId]:undefined;
}
