import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4187','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4187/mvp3-authority-separated.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.OASISRelationExperienceStore&&!!window.OASISRealityFlowTopology&&!!window.OASISRelationAuthority,null,{timeout:60000});
  const report=await page.evaluate(()=>{
    const originalE=E;
    function arm(trace,label){
      E={tick:500,worlds:{},paused:true};const S=mkW('full');E.worlds.full=S;const P=S.parties[0];P.target='road';
      P.relationHistory=[{t:430,npc:'미라',place:'market'},{t:450,npc:'엘리',place:'forest'}];
      P.seenNPC.add('미라');P.seenNPC.add('엘리');
      P.relationField.episodes=[{t:450,key:['미라','엘리'].sort().join('↔'),a:'미라',b:'엘리',places:['market','forest'],from:[430,450],flowTopologyRuns:[1],flowTopologyKey:'1'}];
      OASISRealityFlowTopology.ingestTrace(S,trace,label);
      const active=OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key).sort();
      const authority=OASISRelationAuthority.authoritySnapshot(S,P);
      const actionable=actionableIds(S,P,1);
      const rows=evalP(S,P,1);
      return{danger:S.danger,target:P.target,currentPlace:currentPlace(P),flowKey:OASISRealityFlowTopology.currentKeyForParty(S,P),active,known:authority.known,authorized:authority.authorized,knownButDormant:authority.knownButDormant,actionable,candidates:rows.map(r=>r.id),choice:sig(rows).choice};
    }
    const matching=arm([0.02,0.05,0.08,0.11,0.14,0.17,0.20],'matching-direct');
    const dormant=arm([0.48,0.36,0.25,0.14,0.10,0.16,0.20],'dormant-reversal');
    const gated=['ruin','shrine'];
    const sameKnown=JSON.stringify(matching.known.slice().sort())===JSON.stringify(dormant.known.slice().sort());
    const checks={
      sameEndpoint:matching.danger===dormant.danger&&matching.target===dormant.target&&matching.currentPlace===dormant.currentPlace,
      evidenceRetainedInBoth:sameKnown&&gated.every(id=>matching.known.includes(id)&&dormant.known.includes(id)),
      matchingFlowActivatesRelation:matching.active.length>0,
      dormantFlowWithholdsRelation:dormant.active.length===0,
      matchingFlowGrantsGatedAuthority:gated.every(id=>matching.authorized.includes(id)&&matching.actionable.includes(id)&&matching.candidates.includes(id)),
      dormantFlowPreservesKnowledgeButWithholdsAuthority:gated.every(id=>dormant.known.includes(id)&&dormant.knownButDormant.includes(id)&&!dormant.authorized.includes(id)&&!dormant.actionable.includes(id)&&!dormant.candidates.includes(id)),
      authorityChangesWithoutDeletingEvidence:sameKnown&&JSON.stringify(matching.authorized.slice().sort())!==JSON.stringify(dormant.authorized.slice().sort())
    };
    E=originalE;
    return{question:'Can OASIS preserve remembered relationship knowledge while granting gated execution candidacy only when the current Reality Flow reactivates the relevant relation?',scope:'Tests evidence/knowledge versus current candidate/execution authority separation. It does not erase learned relationships and does not claim topology representation itself is novel.',matching,dormant,checks,interpretation:Object.values(checks).every(Boolean)?'STAGE12_EVIDENCE_AUTHORITY_SEPARATION_SURVIVES':'STAGE12_EVIDENCE_AUTHORITY_SEPARATION_FAILED'};
  });
  console.log('\nSTAGE 12 — RELATION EVIDENCE / CURRENT AUTHORITY SEPARATION');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(report.checks))assert(v,k);
  await writeFile('reality-flow-authority-separation-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
