import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const slot=Number(process.env.OASIS_GAMMA_V21_SEED_SLOT);
if(!Number.isInteger(slot)||slot<0||slot>39)throw Error('INVALID_SLOT');
const hash=x=>createHash('sha256').update(x).digest('hex');
const seeds=Array.from({length:40},(_,i)=>`oasis-gamma-causal-v2.1:${String(i).padStart(3,'0')}`).sort((a,b)=>hash(a).localeCompare(hash(b))||a.localeCompare(b));
const filename=`oasis-gamma-v2.1-causal-probe-seed-slot-${slot}.json`;
const child=spawn(process.execPath,[fileURLToPath(new URL('./oasis-gamma-v2.1-causal-probe.mjs',import.meta.url))],{stdio:'ignore',env:process.env});
let timedOut=false;
const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},80*60*1000);
const exitCode=await new Promise(resolve=>{child.on('exit',resolve);child.on('error',()=>resolve(-1));});clearTimeout(timer);
let sealed=null;
try{sealed=JSON.parse(await readFile(filename,'utf8'));}catch{}
if(!sealed||exitCode!==0)await writeFile(filename,JSON.stringify({protocol:'OASIS Gamma Causal Probe v2.1',status:'failed',codeSha:process.env.GITHUB_SHA,seedSlot:slot,seedSourceIndex:Number(seeds[slot].slice(-3)),seed:seeds[slot],seedHash:hash(seeds[slot]),error:{message:timedOut?'WORKER_TIMEOUT_80_MINUTES':'WORKER_PROCESS_FAILURE'}},null,2));
console.log('SEALED_SEED_TASK_COMPLETE');
