import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';

const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function installationIdentity(root=defaultRoot){
  const directory=realpathSync(root);
  const pkg=JSON.parse(readFileSync(join(directory,'package.json'),'utf8'));
  const build=createHash('sha256');
  function include(relative){
    const path=join(directory,relative);
    if(!existsSync(path)){build.update(relative+'\0absent\0');return;}
    build.update(relative+'\0').update(readFileSync(path)).update('\0');
  }
  function tree(relative){
    const path=join(directory,relative);
    if(!existsSync(path)){build.update(relative+'\0absent\0');return;}
    for(const entry of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const child=join(relative,entry.name);
      if(entry.isDirectory())tree(child);
      else if(entry.isFile())include(child);
    }
  }
  for(const name of ['package.json','package-lock.json','vite.config.ts','scripts/identity.mjs'])include(name);
  for(const name of ['server','content','src','dist'])tree(name);
  return {app:'tracelearn',version:pkg.version,installation:createHash('sha256').update(directory).digest('hex'),build:build.digest('hex')};
}
export function sameIdentity(actual,expected){
  return !!actual&&['app','version','installation','build'].every(key=>typeof actual[key]==='string'&&actual[key]===expected[key]);
}
export async function probeIdentity(port,timeoutMs=750){
  try{
    const response=await fetch(`http://127.0.0.1:${port}/api/identity`,{signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
    return response.ok?await response.json():null;
  }catch{return null;}
}
export async function isPortFree(port){
  return new Promise(resolve=>{
    const server=createServer();
    server.once('error',()=>resolve(false));
    server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));
  });
}
export async function selectInstallationPort(expected,{start=4317,count=20,probe=probeIdentity,free=isPortFree}={}){
  if(!Number.isInteger(start)||start<1024||!Number.isInteger(count)||count<1||start+count>65536)throw new Error('Invalid local port range.');
  let firstFree;
  for(let port=start;port<start+count;port++){
    const actual=await probe(port);
    if(sameIdentity(actual,expected))return {mode:'reuse',port};
    if(firstFree===undefined&&await free(port))firstFree=port;
  }
  if(firstFree!==undefined)return {mode:'start',port:firstFree};
  throw new Error(`No free local port in ${start}–${start+count-1}. Existing applications were left running.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [command,portText]=process.argv.slice(2);
  try{
    const expected=installationIdentity();
    if(command==='select'){
      const selection=await selectInstallationPort(expected);
      process.stdout.write(`${selection.mode}\t${selection.port}\n`);
    }else if(command==='check'){
      const port=Number(portText);
      if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid local port.');
      if(!sameIdentity(await probeIdentity(port),expected))process.exitCode=1;
    }else if(command===undefined||command==='show'){
      process.stdout.write(JSON.stringify(expected)+'\n');
    }else throw new Error('Use identity.mjs show, select, or check PORT.');
  }catch(error){process.stderr.write((error instanceof Error?error.message:'Could not inspect the local installation.')+'\n');process.exitCode=1;}
}
