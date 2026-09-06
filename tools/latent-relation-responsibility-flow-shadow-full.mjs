import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/latent-relation-responsibility-flow-shadow-pilot.mjs';
const TMP='tools/.tmp-latent-relation-responsibility-flow-shadow-full-wrapper.mjs';
let src=await readFile(BASE,'utf8');
src=src
  .replace("const PORT=4195, MAX_TICK=30000, CHUNK=1000;","const PORT=4196, MAX_TICK=120000, CHUNK=1000;")
  .replace(".tmp-latent-relation-responsibility-flow-shadow-pilot.mjs",".tmp-latent-relation-responsibility-flow-shadow-full.mjs")
  .replace("latent-relation-responsibility-flow-shadow-pilot-report.json","latent-relation-responsibility-flow-shadow-full-report.json")
  .replace("if(name==='responsibilityFlow'){if(rising)st.risingEvaluations++;else st.nonRisingEvaluations++}","if(name==='responsibilityFlow'){if(rising){st.risingEvaluations++;gateState[name].stats.risingEvaluations=(gateState[name].stats.risingEvaluations||0)+1}else{st.nonRisingEvaluations++;gateState[name].stats.nonRisingEvaluations=(gateState[name].stats.nonRisingEvaluations||0)+1}}")
  .replace("if(!src.includes('responsibilityFlow'))throw new Error('responsibility-flow transform failed');","if(!src.includes('responsibilityFlow')||!src.includes('MAX_TICK=120000'))throw new Error('responsibility-flow 120k transform failed');");
if(!src.includes('MAX_TICK=120000'))throw new Error('wrapper transform failed');
await writeFile(TMP,src);
const child=spawn(process.execPath,[TMP],{stdio:'inherit',cwd:process.cwd()});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
if(code!==0)process.exit(code??1);
