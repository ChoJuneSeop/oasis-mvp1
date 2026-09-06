import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4181','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4181/index.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Dual Comparison Laboratory')&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  await page.addScriptTag({path:path.resolve('reality-flow-topology.js')});
  await page.waitForFunction(()=>!!window.OASISRealityFlowTopology);

  const report=await page.evaluate(()=>{
    const originalE=E;
    const direct=[0.02,0.05,0.08,0.11,0.14,0.17,0.20];
    const reversal=[0.48,0.36,0.25,0.14,0.10,0.16,0.20];
    function arm(trace,label){
      E={tick:500,worlds:{},paused:true};const S=mkW('full');E.worlds.full=S;const P=S.parties[0];
      P.target='road';P.relationHistory=[{t:430,npc:'미라',place:'market'},{t:450,npc:'엘리',place:'forest'}];
      P.relationField.episodes=[{t:450,key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',places:['market','forest'],from:[430,450],flowTopologyRuns:[1],flowTopologyKey:'1'}];
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const rows=evalP(S,P,1);
      return{danger:S.danger,target:P.target,currentPlace:currentPlace(P),lastDirection:trace.at(-1)>trace.at(-2)?1:-1,flowRuns:OASISRealityFlowTopology.currentRunsForParty(S,P),flowKey:OASISRealityFlowTopology.currentKeyForParty(S,P),active:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key),participants:[...participants(S,P,1)].sort(),ranking:rows.map(r=>r.id),signature:sig(rows)};
    }
    const A=arm(direct,'direct-rising'),B=arm(reversal,'fall-then-rise');
    const checks={sameEndpoint:A.danger===B.danger&&A.target===B.target&&A.currentPlace===B.currentPlace,sameLastDirection:A.lastDirection===B.lastDirection&&A.lastDirection===1,differentFlowTopology:A.flowKey!==B.flowKey,differentAuthority:JSON.stringify(A.active)!==JSON.stringify(B.active),differentParticipants:JSON.stringify(A.participants)!==JSON.stringify(B.participants),differentDecision:A.signature.choice!==B.signature.choice};
    E=originalE;
    return{question:'Can qualitative per-party direction-run topology distinguish trajectories that the last-direction proxy aliased?',scope:'Tests only structural sequence sensitivity of relation authority. It does not claim path representation itself is novel and uses no magnitude, danger, age, or time-window threshold.',direct:A,reversal:B,checks,interpretation:Object.values(checks).every(Boolean)?'STAGE8_FLOW_TOPOLOGY_SURVIVES_ALIASING_TEST':'STAGE8_FLOW_TOPOLOGY_NOT_ESTABLISHED'};
  });
  console.log('\nSTAGE 8 — QUALITATIVE FLOW-RUN TOPOLOGY VALIDATION');console.log(JSON.stringify(report,null,2));
  assert(report.checks.sameEndpoint,'both arms end at the same current coordinate');
  assert(report.checks.sameLastDirection,'both arms share the same final direction');
  assert(report.checks.differentFlowTopology,'direct and reversal trajectories retain different qualitative run topology');
  assert(report.checks.differentAuthority,'different topology grants different current relation authority');
  assert(report.checks.differentParticipants,'different relation authority changes participation');
  assert(report.checks.differentDecision,'different current flow produces a different single realized choice');
  assert(report.interpretation==='STAGE8_FLOW_TOPOLOGY_SURVIVES_ALIASING_TEST','Stage 8 topology candidate survives the Stage 7 aliasing counterexample');
  await writeFile('reality-flow-topology-validation-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
