import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4185','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4185/mvp3-pure.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.OASISRealityFlowPure&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const report=await page.evaluate(()=>{
    const originalE=E;
    const direct=[0.02,0.05,0.08,0.11,0.14,0.17,0.20],reversal=[0.48,0.36,0.25,0.14,0.10,0.16,0.20];
    function arm(trace,label){
      E={tick:500,worlds:{},paused:true};const S=mkW('full');E.worlds.full=S;const P=S.parties[0];P.target='road';
      P.relationHistory=[{t:430,npc:'미라',place:'market'},{t:450,npc:'엘리',place:'forest'}];
      P.relationField.episodes=[{t:450,key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',places:['market','forest'],from:[430,450],flowTopologyRuns:[1],flowTopologyKey:'1'}];
      OASISRealityFlowPure.ingestTrace(S,trace,label);const rows=evalP(S,P,1);
      return{danger:S.danger,target:P.target,currentPlace:currentPlace(P),flowRuns:OASISRealityFlowPure.currentRunsForParty(S,P),flowKey:OASISRealityFlowPure.currentKeyForParty(S,P),active:OASISRealityFlowPure.activeEpisodes(S,P).map(ep=>ep.key),participants:[...participants(S,P,1)].sort(),ranking:rows.map(r=>r.id),signature:sig(rows)};
    }
    const A=arm(direct,'direct-rising'),B=arm(reversal,'fall-then-rise');
    const checks={sameEndpoint:A.danger===B.danger&&A.target===B.target&&A.currentPlace===B.currentPlace,differentTopology:A.flowKey!==B.flowKey,differentAuthority:JSON.stringify(A.active)!==JSON.stringify(B.active),differentParticipants:JSON.stringify(A.participants)!==JSON.stringify(B.participants),differentDecision:A.signature.choice!==B.signature.choice};
    E=originalE;return{question:'After legacy relation-field removal, does the pure topology authority still distinguish the Stage 7 same-coordinate counterexample?',scope:'Minimal mechanism validation with identical stored relation experience. It does not claim the qualitative path representation is novel or generally optimal.',direct:A,reversal:B,checks,interpretation:Object.values(checks).every(Boolean)?'STAGE10_PURE_TOPOLOGY_COUNTEREXAMPLE_SURVIVES':'STAGE10_PURE_TOPOLOGY_COUNTEREXAMPLE_FAILED'};
  });
  console.log('\nSTAGE 10B — PURE TOPOLOGY COUNTEREXAMPLE VALIDATION');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  await writeFile('reality-flow-pure-topology-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
