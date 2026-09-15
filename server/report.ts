type Citation={sectionId:string;quote:string};
type ChatRecord={question:string;answer:string;model:string;elapsedMs:number;insufficient:boolean;citations:Citation[];support?:{outcome:string;disclosure:string;claims:Array<{text:string;citations:Citation[]}>}};
const quoteLines=(citations:Citation[])=>citations.flatMap(c=>[`> [${c.sectionId}] ${c.quote.replace(/\r?\n/g,'\n> ')}`]);
/** Preserve which quotations support each accepted claim, including in exported records. */
export function aiReportLines(chat:ChatRecord):string[]{
 const content=chat.support?.outcome==='supported'
  ?chat.support.claims.flatMap((claim,index)=>['',`#### Claim ${index+1}`,claim.text,...quoteLines(claim.citations)])
  :[chat.answer,...quoteLines(chat.citations)];
 const disposition=chat.support?.outcome==='unverified'?'No answer passed local checks; source sufficiency was not established.':chat.support?.outcome==='insufficient'?'Selected sources were judged insufficient by the local model.':chat.support?.outcome==='supported'?'An answer passed automated support checks.':`Legacy model insufficient flag: ${chat.insufficient}`;
 return['',`### ${chat.question}`,...content,`Model: ${chat.model}; response time: ${chat.elapsedMs} ms`,disposition,`Support outcome: ${chat.support?.outcome??'legacy exact-quote check only'}`,chat.support?.disclosure??'Legacy answers were checked only for exact quotations, not semantic support.'];
}
