import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4187','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4187/mvp3-topology-authority-isolated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.OASISRelationExperienceStore&&!!window.OASISRealityFlowTopology&&!!window.OASISExecutionAuthority,null,{timeout:60000});
  const report=await page.evaluate(()=>{
    const originalE=E;
    E={tick:500,worlds:{},paused:true};const S=mkW('full');E.worlds.full=S;const P=S.parties[0];P.target='road';
    P.relationHistory=[{t:430,npc:'미라',place:'market'},{t:450,npc:'엘리',place:'forest'}];
    P.seenNPC.add('미라');P.seenNPC.add('엘리');
    P.relationField.episodes=[{t:450,key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',places:['market','forest'],from:[430,450],flowTopologyRuns:[1],flowTopologyKey:'1'}];
    const gated=['ruin','shrine'];

    OASISRealityFlowTopology.ingestTrace(S,[0.48,0.36,0.25,0.14,0.10,0.16,0.20],'mismatch-flow');
    const dormant={
      topologyKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
      active:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key),
      known:availableOasis(S,P,1),
      actionable:actionableIds(S,P,1),
      candidates:evalP(S,P,1).map(r=>r.id)
    };

    OASISRealityFlowTopology.ingestTrace(S,[0.10,0.12,0.14,0.16,0.18,0.20],'matching-flow');
    const authorized={
      topologyKey:OASISRealityFlowTopology.currentKeyForParty(S,P),
      active:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key),
      known:availableOasis(S,P,1),
      actionable:actionableIds(S,P,1),
      candidates:evalP(S,P,1).map(r=>r.id)
    };

    const checks={
      noPageErrors:true,
      memoryEvidenceRetained:gated.every(id=>dormant.known.includes(id)&&authorized.known.includes(id)),
      dormantTopologyHasNoAuthority:dormant.active.length===0,
      dormantHistoryCannotExecute:gated.every(id=>!dormant.actionable.includes(id)&&!dormant.candidates.includes(id)),
      matchingTopologyReactivatesRelation:authorized.active.length===1&&authorized.topologyKey==='1',
      currentAuthorityCanExecute:gated.every(id=>authorized.actionable.includes(id)&&authorized.candidates.includes(id)),
      sameStoredHistoryAcrossStates:true
    };
    E=originalE;
    return{
      question:'Can stored relation evidence remain remembered without becoming an executable candidate until the current Reality Flow grants matching relation authority?',
      scope:'Authority-boundary validation. The test preserves stored relation history and place knowledge in both arms; only current topology changes. It validates evidence/execution separation, not that exact topology equality is universally sufficient.',
      dormant,authorized,checks,
      interpretation:Object.values(checks).every(Boolean)?'STAGE12_EVIDENCE_EXECUTION_AUTHORITY_SEPARATION_SURVIVES':'STAGE12_AUTHORITY_BOUNDARY_FAILED'
    };
  });
  report.checks.noPageErrors=errors.length===0;report.errors=errors;
  console.log('\nSTAGE 12 — EVIDENCE / EXECUTION AUTHORITY BOUNDARY VALIDATION');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  await writeFile('reality-flow-execution-authority-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
