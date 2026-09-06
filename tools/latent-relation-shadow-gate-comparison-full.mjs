import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/latent-relation-shadow-gate-comparison.mjs';
const TMP='tools/.tmp-latent-relation-shadow-gate-comparison-full.mjs';
let src=await readFile(BASE,'utf8');
src=src
  .replace("const PORT=4192, MAX_TICK=30000, CHUNK=1000;","const PORT=4193, MAX_TICK=120000, CHUNK=1000;")
  .replace("const REPORT_FILE='latent-relation-shadow-gate-comparison-report.json';","const REPORT_FILE='latent-relation-shadow-gate-comparison-full-report.json';")
  .replace("if(t===10000||t===20000||t===30000)","if(t===10000||t===30000||t===60000||t===90000||t===120000)");
if(!src.includes('MAX_TICK=120000'))throw new Error('120k transform failed');
await writeFile(TMP,src);
const child=spawn(process.execPath,[TMP],{stdio:'inherit',cwd:process.cwd()});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
if(code!==0)process.exit(code??1);
