import {AppError,EMBED,OLLAMA} from './ai.ts';

export {EMBED};
export const CURRENT_MODEL=process.env.TRACELEARN_ANSWER_MODEL||'qwen3.5:9b';
export const OPTIONS=Object.freeze({temperature:0,seed:42,num_ctx:16384,num_predict:1800,top_k:20,top_p:0.95,min_p:0,presence_penalty:0,repeat_penalty:1});
export const THINK=false;
const CHAT_TIMEOUT_MS=120_000;
type ChatResult={raw:string;stats:{totalDurationMs:number;promptTokens:number;outputTokens:number}};
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const metric=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;

function cancelled(signal?:AbortSignal){if(signal?.aborted)throw new AppError('Generation cancelled.',499);}
function unavailable(){return new AppError('Local model is unavailable or timed out. Start Ollama, check the configured model, then retry.',503);}
function invalidResponse(){return new AppError('Local model returned an unreadable response. Restart Ollama, then retry.',503);}

// Ollama can wrap the llama-server JSON error in its own error string.
function errorMessage(value:unknown,depth=0):string{
 if(depth>5)return '';
 if(typeof value==='string'){
  const trimmed=value.trim();
  if(trimmed.startsWith('{')){try{return errorMessage(JSON.parse(trimmed),depth+1);}catch{/* A plain error string remains usable. */}}
  return trimmed;
 }
 if(record(value))return errorMessage(value.error??value.message,depth+1);
 return '';
}
function contextExceeded(value:unknown){
 const message=errorMessage(value);
 // Exact error families in Ollama v0.34.0 llm/llama_server.go and its tests:
 // https://github.com/ollama/ollama/blob/v0.34.0/llm/llama_server.go
 // https://github.com/ollama/ollama/blob/v0.34.0/llm/llama_server_test.go
 return /^the prompt is longer than the context length currently available to the model(?:;|$)/i.test(message)
  ||/^(?:the )?input length exceeds the context length\.?$/i.test(message)
  ||/^request \(\d+ tokens\) exceeds the available context size \(\d+ tokens\)(?:,|$)/i.test(message);
}

/** One transport request. Callers own any generation-validation retry policy. */
export async function localChatRaw(system:string,user:string,format:unknown,signal?:AbortSignal):Promise<ChatResult>{
 cancelled(signal);
 const timeout=AbortSignal.timeout(CHAT_TIMEOUT_MS);
 const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
 try{
  const response=await fetch(OLLAMA+'/api/chat',{
   method:'POST',headers:{'Content-Type':'application/json'},signal:requestSignal,
   body:JSON.stringify({model:CURRENT_MODEL,think:THINK,stream:false,truncate:false,format,options:OPTIONS,keep_alive:'30m',messages:[{role:'system',content:system},{role:'user',content:user}]})
  });
  cancelled(signal);
  const body:unknown=await response.json();
  cancelled(signal);
  if(timeout.aborted)throw unavailable();
  if(!response.ok){
   if(response.status===400&&contextExceeded(body))throw new AppError(`This request exceeds the local model context limit (${OPTIONS.num_ctx} tokens). Shorten the question or import a smaller source, then retry. No source text was silently discarded.`,400);
   if(response.status===404)throw new AppError(`The configured local model (${CURRENT_MODEL}) is unavailable. Install this model in Ollama, then retry.`,503);
   throw new AppError(`Local model rejected this request (HTTP ${response.status}). Check the configured model and output-format settings, then retry.`,503);
  }
  if(!record(body)||!record(body.message)||typeof body.message.content!=='string'||!metric(body.total_duration)||!metric(body.prompt_eval_count)||!metric(body.eval_count))throw invalidResponse();
  return {raw:body.message.content,stats:{totalDurationMs:body.total_duration/1e6,promptTokens:body.prompt_eval_count,outputTokens:body.eval_count}};
 }catch(error){
  cancelled(signal);
  if(timeout.aborted)throw unavailable();
  if(error instanceof AppError)throw error;
  if(error instanceof SyntaxError)throw invalidResponse();
  throw unavailable();
 }
}

export async function localChatJSON(system:string,user:string,format:unknown,signal?:AbortSignal){
 const result=await localChatRaw(system,user,format,signal);
 cancelled(signal);
 try{return {...result,data:JSON.parse(result.raw) as unknown};}
 catch{
  // A well-formed HTTP response can still contain invalid generated JSON.
  // Preserve it for the caller's validation audit and bounded retry.
  throw Object.assign(new SyntaxError('The model output is not valid JSON.'),result);
 }
}

export async function modelStatus(){
 const base={model:CURRENT_MODEL,embedding:EMBED};
 try{
  const response=await fetch(OLLAMA+'/api/tags',{signal:AbortSignal.timeout(2000)});
  if(!response.ok)throw Error('Model status request failed.');
  const body:unknown=await response.json();
  if(!record(body)||!Array.isArray(body.models)||body.models.some(model=>!record(model)||typeof model.name!=='string'))throw Error('Invalid model status.');
  const models=body.models.map(model=>({name:model.name as string,digest:typeof model.digest==='string'?model.digest:'',size:metric(model.size)?model.size:0}));
  const names=new Set(models.map(model=>model.name));
  return {online:true,ready:names.has(CURRENT_MODEL)&&names.has(EMBED),...base,models};
 }catch{return {online:false,ready:false,...base,models:[]};}
}
