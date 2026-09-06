import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const BASE='tools/latent-relation-danger-circular-surrogate-control.mjs';
const TMP='tools/.tmp-latent-relation-danger-surrogate-37.mjs';
let src=await readFile(BASE,'utf8');
src=src
  .replace('const PORT=4200, MAX_TICK=30000;','const PORT=4201, MAX_TICK=30000;')
  .replace("const REPORT_FILE='latent-relation-danger-circular-surrogate-control-report.json';","const REPORT_FILE='latent-relation-danger-surrogate-37-report.json';")
  .replace("const names=['exactProvenance','completedProcess','lag0','lag3','shift125','shift250','shift375','shift500','shift625','shift750','shift875'];",
`const surrogateSpecs=Array.from({length:37},(_,i)=>{const frac=.05+i*.025;return{name:'shift'+String(Math.round(frac*1000)).padStart(3,'0'),frac}});
    const surrogateFrac=Object.fromEntries(surrogateSpecs.map(x=>[x.name,x.frac]));
    const names=['exactProvenance','completedProcess','lag0','lag3',...surrogateSpecs.map(x=>x.name)];`)
  .replace("const frac={shift125:.125,shift250:.25,shift375:.375,shift500:.5,shift625:.625,shift750:.75,shift875:.875}[name];\n      if(frac==null)return false;const off=Math.max(1,Math.floor(N*frac));return !!seq[(idx+off)%N];",
"const frac=surrogateFrac[name];\n      if(frac==null)return false;const off=Math.max(1,Math.floor(N*frac));return !!seq[(idx+off)%N];")
  .replace("const surrogateNames=['shift125','shift250','shift375','shift500','shift625','shift750','shift875'];",
"const surrogateNames=surrogateSpecs.map(x=>x.name);")
  .replace("const verdict={lag0AboveNullMax:result.gates.lag0.choiceYield>result.null.choiceYieldMax,lag3AboveNullMax:result.gates.lag3.choiceYield>result.null.choiceYieldMax,lag0AboveNullMedian:result.gates.lag0.choiceYield>result.null.choiceYieldMedian,lag3AboveNullMedian:result.gates.lag3.choiceYield>result.null.choiceYieldMedian};",
`const surrogateRows=Object.entries(result.gates).filter(([n])=>n.startsWith('shift'));
  const exceedLag0=surrogateRows.filter(([_,s])=>s.choiceYield>=result.gates.lag0.choiceYield).length;
  const exceedLag3=surrogateRows.filter(([_,s])=>s.choiceYield>=result.gates.lag3.choiceYield).length;
  const pLag0=(exceedLag0+1)/(surrogateRows.length+1),pLag3=(exceedLag3+1)/(surrogateRows.length+1);
  const verdict={nSurrogates:surrogateRows.length,exceedLag0,exceedLag3,pLag0,pLag3,lag0AboveNullMax:result.gates.lag0.choiceYield>result.null.choiceYieldMax,lag3AboveNullMax:result.gates.lag3.choiceYield>result.null.choiceYieldMax};`)
  .replace("console.log('CIRCULAR-SURROGATE '+JSON.stringify({preCounts:result.preCounts,replayMismatch:result.replayMismatch,gates:compact,null:result.null,verdict}));",
"console.log('SURROGATE-37 '+JSON.stringify({preCounts:result.preCounts,replayMismatch:result.replayMismatch,observed:{lag0:compact.lag0,lag3:compact.lag3},null:result.null,verdict,surrogates:Object.fromEntries(Object.entries(compact).filter(([n])=>n.startsWith('shift')))}));")
  .replace("purpose:'two-pass circular time-shift surrogate null control for danger-rise alignment'","purpose:'two-pass 37-surrogate time-shift null distribution for danger-rise alignment'")
  .replace("surrogates:'1/8..7/8 circular shifts preserve rise sequence frequency/order while breaking alignment with decision flow'","surrogates:'37 circular shifts from 5% to 95% in 2.5% steps; preserve rise sequence frequency/order while breaking alignment with decision flow'");
if(!src.includes('surrogateSpecs')||!src.includes('SURROGATE-37')||!src.includes('pLag3'))throw new Error('37-surrogate transform failed');
await writeFile(TMP,src);
const child=spawn(process.execPath,[TMP],{stdio:'inherit',cwd:process.cwd()});
const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
if(code!==0)process.exit(code??1);
