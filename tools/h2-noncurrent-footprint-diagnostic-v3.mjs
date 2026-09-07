import { readFile, writeFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';

// Diagnostic wrapper: preserve invalid-run output before enforcing the validity gate.
const SOURCE='tools/h2-noncurrent-footprint-future-effect-v3.mjs';
const TEMP='tools/.h2-noncurrent-footprint-diagnostic-run.mjs';
let src=await readFile(SOURCE,'utf8');
const target="if(!result.validity.validityPass)throw new Error(`H2 noncurrent-footprint validity failed: ${JSON.stringify(result.validity)}`);\n  console.log('OASIS-H2-NONCURRENT-FOOTPRINT-FUTURE-EFFECT '+JSON.stringify(result.summary));\n  await writeFile(REPORT,JSON.stringify(result,null,2));";
const replacement="await writeFile(REPORT,JSON.stringify(result,null,2));\n  console.log('OASIS-H2-NONCURRENT-FOOTPRINT-DIAGNOSTIC '+JSON.stringify({validity:result.validity,summary:result.summary,initialization:result.experiments.map(x=>x.initialization),checkpoints:result.experiments.map(x=>x.checkpoint)}));\n  if(!result.validity.validityPass)throw new Error(`H2 noncurrent-footprint validity failed: ${JSON.stringify(result.validity)}`);\n  console.log('OASIS-H2-NONCURRENT-FOOTPRINT-FUTURE-EFFECT '+JSON.stringify(result.summary));";
if(!src.includes(target))throw new Error('diagnostic patch target missing');
src=src.replace(target,replacement);
await writeFile(TEMP,src);
const child=spawn(process.execPath,[TEMP],{stdio:'inherit'});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',(c,s)=>resolve(c??(s?1:0)))});
await unlink(TEMP).catch(()=>{});
process.exit(code);
