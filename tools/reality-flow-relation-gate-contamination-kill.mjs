import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4186','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4186/mvp3-topology-isolated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.OASISRelationExperienceStore&&!!window.OASISRealityFlowTopology,null,{timeout:60000});
  const report=await page.evaluate(()=>{
    const originalE=E;
    E={tick:500,worlds:{},paused:true};const S=mkW('full');E.worlds.full=S;const P=S.parties[0];P.target='road';
    P.relationHistory=[{t:430,npc:'미라',place:'market'},{t:450,npc:'엘리',place:'forest'}];
    P.seenNPC.add('미라');P.seenNPC.add('엘리');
    P.relationField.episodes=[{t:450,key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',places:['market','forest'],from:[430,450],flowTopologyRuns:[1],flowTopologyKey:'1'}];
    OASISRealityFlowTopology.ingestTrace(S,[0.48,0.36,0.25,0.14,0.10,0.16,0.20],'mismatch-flow');
    const active=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key);
    const availableWithHistory=availableOasis(S,P,1);
    const actionableWithHistory=actionableIds(S,P,1);
    const rowsWithHistory=evalP(S,P,1).map(r=>r.id);
    const savedHistory=P.relationHistory;P.relationHistory=[];
    const availableWithoutHistory=availableOasis(S,P,1);
    const actionableWithoutHistory=actionableIds(S,P,1);
    const rowsWithoutHistory=evalP(S,P,1).map(r=>r.id);
    P.relationHistory=savedHistory;
    const gated=['ruin','shrine'];
    const checks={
      topologyAuthorityDormant:active.length===0,
      gatedPlacesOpenedByHistory:gated.every(id=>availableWithHistory.includes(id)&&actionableWithHistory.includes(id)),
      gatedPlacesClosedWithoutHistory:gated.every(id=>!availableWithoutHistory.includes(id)&&!actionableWithoutHistory.includes(id)),
      candidateSetReceivesHistoryAuthority:gated.every(id=>rowsWithHistory.includes(id)&&!rowsWithoutHistory.includes(id)),
      currentFlowDidNotGrantThatAuthority:active.length===0
    };
    E=originalE;
    return{question:'After fixed-threshold authority removal, can mere possession of old relationship history still open executable gated possibilities even when current topology grants no relation authority?',scope:'Tests only the residual relation-history-to-availability path in the isolated candidate. It distinguishes stored/known relationship evidence from current execution-candidate authority; it does not claim that remembering a place should be erased.',active,withHistory:{available:availableWithHistory,actionable:actionableWithHistory,candidates:rowsWithHistory},withoutHistory:{available:availableWithoutHistory,actionable:actionableWithoutHistory,candidates:rowsWithoutHistory},checks,interpretation:Object.values(checks).every(Boolean)?'STAGE11_HISTORY_POSSESSION_STILL_GRANTS_CANDIDATE_AUTHORITY':'STAGE11_RESIDUAL_GATE_CONTAMINATION_NOT_CONFIRMED'};
  });
  console.log('\nSTAGE 11 — RELATION-HISTORY GATE AUTHORITY CONTAMINATION KILL');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  await writeFile('reality-flow-relation-gate-contamination-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
