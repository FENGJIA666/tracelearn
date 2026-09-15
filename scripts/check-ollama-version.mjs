// This release relies on the tested Ollama chat API, including truncate:false.
let version;
try {
 const response=await fetch('http://127.0.0.1:11434/api/version',{signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('Version endpoint failed.');
 version=(await response.json()).version;
}catch{
 console.error('Cannot read the local Ollama version. Start Ollama, then retry setup.');
 process.exit(1);
}
const match=typeof version==='string'&&/^(\d+)\.(\d+)\.(\d+)(?:$|[-+])/.exec(version);
if(!match||!(Number(match[1])>0||Number(match[2])>=34)){
 console.error(`Ollama 0.34.0 or newer is required for this release (found ${version??'unknown'}). Update Ollama, then retry setup.`);
 process.exit(1);
}
console.log(`Ollama ${version} meets the release API requirement.`);
