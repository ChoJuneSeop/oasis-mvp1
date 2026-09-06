import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4213','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`HARNESS FAIL - ${m}`);console.log(`CONTROL PASS - ${m}`)}
let browser;
try{
 await sleep(700);browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4213/mvp3-authority-separated-fullhistory.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.title.includes('Full-History Authority Separated')&&!!window.OASISRealityFlowTopology,null,{timeout:60000});
 const report=await page.evaluate(()=>{
  const originalE=E;E={tick:700,worlds:{},paused:true};const A=mkW('full'),B=mkW('full');E.worlds={A,B};const PA=A.parties[0],PB=B.parties[0];
  function structuralRuns(trace){const runs=[];let origin=trace[0],extreme=trace[0],dir=0;for(let i=1;i<trace.length;i++){const x=trace[i];if(dir===0){if(x>origin){dir=1;runs.push(1);extreme=x}else if(x<origin){dir=-1;runs.push(-1);extreme=x}continue}if(dir===1){if(x>=extreme){extreme=x;continue}if(x<origin){const p=extreme;dir=-1;runs.push(-1);origin=p;extreme=x}}else{if(x<=extreme){extreme=x;continue}if(x>origin){const p=extreme;dir=1;runs.push(1);origin=p;extreme=x}}}return runs}
  const sk=t=>structuralRuns(t).join('>'),K=[.2,.1,.2],L=[.2,.3,.2];
  function apply(S,t,l){OASISRealityFlowTopology.ingestTrace(S,t,l)}
  function tagged(S,P,id,t,l){apply(S,t,l);const before=P.relationField.episodes.length;outcome(S,P,id);for(const ep of P.relationField.episodes.slice(before))ep._stage32StructuralKey=sk(t)}
  apply(A,[.15,.2],'seedA');apply(B,[.15,.2],'seedB');outcome(A,PA,'market');outcome(B,PB,'market');
  E.tick=708;tagged(A,PA,'lake',K,'AK');tagged(B,PB,'lake',L,'BL');
  E.tick=716;tagged(A,PA,'camp',L,'AL');tagged(B,PB,'camp',K,'BK');
  const eps=P=>(P.relationField.episodes||[]).map(ep=>({key:ep.key,from:ep.from,exact:ep.flowTopologyKey,structural:ep._stage32StructuralKey??null,a:ep.a,b:ep.b}));
  function prereq(S,P){const h=hiddenDefs.find(x=>x.id==='wanderer');const active=(P.relationField.episodes||[]).filter(ep=>ep._stage32StructuralKey==='-1');const pair=['???','아론'].sort().join('↔');return{seenUnknown:P.seenNPC.has('???'),seenAaron:P.seenNPC.has('아론'),campKnown:P.disc.has('camp')||availableOasis(S,P,1).includes('camp'),canyonAvailable:P.disc.has('canyon')||availableOasis(S,P,1).includes('canyon'),activeMinus:active.map(ep=>ep.key),hasUnknownAaron:active.some(ep=>ep.key===pair),hiddenDef:h}}
  const out={episodesA:eps(PA),episodesB:eps(PB),wandererA:prereq(A,PA),wandererB:prereq(B,PB)};E=originalE;return out;
 });
 report.errors=errors;report.controls={cleanPage:errors.length===0,bothSawUnknownAndAaron:report.wandererA.seenUnknown&&report.wandererA.seenAaron&&report.wandererB.seenUnknown&&report.wandererB.seenAaron,bothCanReachCanyon:report.wandererA.canyonAvailable&&report.wandererB.canyonAvailable};
 report.diagnosis=report.wandererB.hasUnknownAaron?'B_HAS_STRUCTURAL_UNKNOWN_AARON_PAIR__INSPECT_CUSTOM_HIDDEN_LOGIC':'B_MISSING_STRUCTURAL_UNKNOWN_AARON_PAIR__TAGGING_OR_EPISODE_CONSTRUCTION_ASYMMETRY';
 await writeFile('reality-flow-stage32-asymmetry-diagnostic-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));for(const[k,v]of Object.entries(report.controls))assert(v,k);
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
