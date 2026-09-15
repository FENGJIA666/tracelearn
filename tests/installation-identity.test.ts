import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {installationIdentity,sameIdentity,selectInstallationPort,probeIdentity} from '../scripts/identity.mjs';

function fixture(root:string){mkdirSync(join(root,'dist'));writeFileSync(join(root,'package.json'),JSON.stringify({name:'tracelearn',version:'1.2.0'}));writeFileSync(join(root,'dist/index.html'),'<main>Original fixture</main>');}
test('installation and build identities distinguish copies, versions and asset changes without paths',()=>{
  const a=mkdtempSync(join(tmpdir(),'tracelearn-copy-a-')),b=mkdtempSync(join(tmpdir(),'tracelearn-copy-b-'));
  try{fixture(a);fixture(b);const first=installationIdentity(a),second=installationIdentity(b);
    assert.equal(first.build,second.build);assert.notEqual(first.installation,second.installation);assert.equal(sameIdentity(first,second),false);
    assert.doesNotMatch(JSON.stringify(first),/tracelearn-copy|\/Users\/|\/tmp\//);assert.match(first.installation,/^[a-f0-9]{64}$/);
    assert.equal(sameIdentity(installationIdentity(a),first),true);
    writeFileSync(join(a,'dist/index.html'),'<main>Changed fixture</main>');assert.notEqual(installationIdentity(a).build,first.build);
    writeFileSync(join(b,'package.json'),JSON.stringify({name:'tracelearn',version:'1.1.0'}));assert.equal(sameIdentity(installationIdentity(b),second),false);
  }finally{rmSync(a,{recursive:true,force:true});rmSync(b,{recursive:true,force:true});}
});
test('launcher selection reuses only its exact installation and leaves conflicting local services alone',async()=>{
  const expected={app:'tracelearn',version:'1.2.0',installation:'a'.repeat(64),build:'b'.repeat(64)};
  const actual=new Map<number,unknown>([[4317,{...expected,installation:'c'.repeat(64)}],[4319,expected]]);
  const probe=async(port:number)=>actual.get(port)||null,free=async(port:number)=>!actual.has(port);
  assert.deepEqual(await selectInstallationPort(expected,{start:4317,count:4,probe,free}),{mode:'reuse',port:4319});
  actual.delete(4319);assert.deepEqual(await selectInstallationPort(expected,{start:4317,count:4,probe,free}),{mode:'start',port:4318});
  actual.set(4318,{...expected,version:'1.1.0'});assert.deepEqual(await selectInstallationPort(expected,{start:4317,count:4,probe,free}),{mode:'start',port:4319});
  await assert.rejects(selectInstallationPort(expected,{start:4317,count:2,probe,free:async()=>false}),/Existing applications were left running/);
});
test('identity selection distinguishes two actual loopback servers and makes no mutation requests',async()=>{
  const expected={app:'tracelearn',version:'1.2.0',installation:'a'.repeat(64),build:'b'.repeat(64)};
  const calls:string[]=[];
  const servers=[{...expected,installation:'c'.repeat(64)},expected].map(value=>createServer((req,res)=>{calls.push(`${req.method} ${req.url}`);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));}));
  try{
    for(const server of servers)await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const ports=servers.map(server=>(server.address() as {port:number}).port);
    assert.equal(sameIdentity(await probeIdentity(ports[0]),expected),false);
    assert.equal(sameIdentity(await probeIdentity(ports[1]),expected),true);
    assert.deepEqual(calls,['GET /api/identity','GET /api/identity']);
  }finally{await Promise.all(servers.map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));}
});
