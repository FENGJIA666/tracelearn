import {writeFileSync,mkdirSync} from 'node:fs';
const expected={'qwen3:4b':'359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7','qwen3-embedding:0.6b':'ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d'};
const tags=await(await fetch('http://127.0.0.1:11434/api/tags')).json();
const version=await(await fetch('http://127.0.0.1:11434/api/version')).json();
mkdirSync('.local',{recursive:true});writeFileSync('.local/runtime-models.json',JSON.stringify({capturedAt:new Date().toISOString(),ollama:version,models:tags.models},null,2));
const problems=Object.entries(expected).filter(([name,digest])=>!tags.models.some(m=>m.name===name&&m.digest===digest));
if(problems.length){console.error('Model versions differ from the tested release: '+problems.map(([n])=>n).join(', ')+'. Exact benchmark reproduction requires the hashes in this script.');process.exitCode=1;}else console.log('Both model digests match the tested release. Runtime manifest recorded in .local/runtime-models.json.');
