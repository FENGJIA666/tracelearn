import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';

const out = '.local/portable-build';
await build({configFile:false,plugins:[react()],define:{'import.meta.env.VITE_PORTABLE':JSON.stringify('true'),'process.env.NODE_ENV':JSON.stringify('production')},build:{
  outDir:out,emptyOutDir:true,cssCodeSplit:false,
  lib:{entry:'src/main.tsx',formats:['iife'],name:'TraceLearnPortable',fileName:()=> 'portable.js'}
}});
const js = readFileSync(`${out}/portable.js`,'utf8').replaceAll('</script','<\\/script');
const css = readdirSync(out).filter(n=>n.endsWith('.css')).map(n=>readFileSync(`${out}/${n}`,'utf8')).join('\n');
if (!css || !js) throw new Error('Portable build is incomplete.');
const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>TraceLearn · Portable practice</title><style>${css}</style></head><body><div id="root"></div><noscript>Enable JavaScript to run this local practice application. It does not make network or AI requests.</noscript><script>${js}</script></body></html>`;
writeFileSync('submission/TraceLearn-Portable.html',html);
console.log(`Portable practice: ${Buffer.byteLength(html)} bytes, self-contained HTML. Open directly in a browser.`);
