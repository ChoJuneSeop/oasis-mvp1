import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4185','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  async function run(url,mode){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(m=>document.title.includes('Laboratory')&&!!window.OASISRealityFlowTopology&&(m!=='full'||!!window.OASISRelationExperienceStoreFullHistory)&&(m!=='windowed'||!!window.OASISRelationExperienceStore),mode,{timeout:60000});
    const out=await page.evaluate(()=>{
      reset();E.paused=true;
      for(let i=0;i<1800;i++){E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e)}
      const ext=['rule','utility','qlite','retrieval'];
      const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full;
      const parties=S.parties.map(P=>({
        id:P.id,
        relationHistoryLength:P.relationHistory.length,
        relationHistory:P.relationHistory.map(x=>`${x.t}|${x.npc}|${x.place}`),
        episodeCount:P.relationField?.episodes?.length||0,
        episodeKeys:(P.relationField?.episodes||[]).map(ep=>`${ep.from?.join('>')}|${ep.key}|${ep.flowTopologyKey||''}`),
        active:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key).sort(),
        choices:P.choiceHistory.map(x=>x.target)
      }));
      return{
        title:document.title,
        external,
        actions:S.c.actions||0,
        recombinations:S.c.relationRecombination||0,
        topologyActivations:S.c.realityFlowTopologyActivation||0,
        topologyObservations:S.c.realityFlowTopologyObservation||0,
        legacyActivations:S.c.relationFieldActivation||0,
        parties
      };
    });
    await page.close();return{out,errors};
  }

  const windowed=await run('http://127.0.0.1:4185/mvp3-topology-isolated.html','windowed');
  const full=await run('http://127.0.0.1:4185/mvp3-topology-isolated-fullhistory.html','full');
  const externalEqual=Object.fromEntries(Object.keys(windowed.out.external).map(k=>[k,JSON.stringify(windowed.out.external[k])===JSON.stringify(full.out.external[k])]));
  const perParty=windowed.out.parties.map((W,i)=>{
    const F=full.out.parties[i];
    return{
      id:W.id,
      windowedHistoryLength:W.relationHistoryLength,
      fullHistoryLength:F.relationHistoryLength,
      recencyWindowBindingPotential:Math.max(W.relationHistoryLength,F.relationHistoryLength)>18,
      sameRelationHistory:JSON.stringify(W.relationHistory)===JSON.stringify(F.relationHistory),
      windowedEpisodes:W.episodeCount,
      fullEpisodes:F.episodeCount,
      sameEpisodeSet:JSON.stringify(W.episodeKeys)===JSON.stringify(F.episodeKeys),
      sameCurrentAuthority:JSON.stringify(W.active)===JSON.stringify(F.active),
      sameChoicePath:JSON.stringify(W.choices)===JSON.stringify(F.choices)
    };
  });
  const treatmentDifference={
    episodeFormation:perParty.some(x=>!x.sameEpisodeSet||x.windowedEpisodes!==x.fullEpisodes),
    topologyActivation:windowed.out.topologyActivations!==full.out.topologyActivations,
    currentAuthority:perParty.some(x=>!x.sameCurrentAuthority),
    realizedChoicePath:perParty.some(x=>!x.sameChoicePath),
    relationHistoryFeedback:perParty.some(x=>!x.sameRelationHistory)
  };
  const bindingPotential=perParty.some(x=>x.recencyWindowBindingPotential);
  const materialDifference=Object.values(treatmentDifference).some(Boolean);
  const controls={
    bothRunsClean:windowed.errors.length===0&&full.errors.length===0,
    noLegacyAuthority:windowed.out.legacyActivations===0&&full.out.legacyActivations===0,
    sameObservationBudget:windowed.out.topologyObservations===1800&&full.out.topologyObservations===1800,
    actionsContinue:windowed.out.actions>0&&full.out.actions>0,
    externalComparisonEqual:Object.values(externalEqual).every(Boolean),
    recencyWindowActuallyReachable:bindingPotential
  };
  const interpretation=!Object.values(controls).every(Boolean)
    ?'STAGE11_RETENTION_WINDOW_TEST_INVALID_CONTROL'
    :materialDifference
      ?'STAGE11_FIXED_RECENCY_WINDOW_MATERIALLY_AFFECTS_REALITY_FLOW'
      :'STAGE11_FIXED_RECENCY_WINDOW_NOT_MATERIAL_IN_TESTED_FLOW';
  const report={
    question:'Does the arbitrary last-18 relation-history composition window materially change isolated topology-based Reality Flow under the same live world?',
    scope:'Controlled retention ablation. The only intended storage change is prior relation selection: last 18 versus all relation history; both retain the same episode cap of 80 and the same topology authority. A difference establishes sensitivity to the fixed recency window, not that unlimited retention is universally better.',
    windowed:{title:windowed.out.title,actions:windowed.out.actions,recombinations:windowed.out.recombinations,topologyActivations:windowed.out.topologyActivations,errors:windowed.errors},
    fullHistory:{title:full.out.title,actions:full.out.actions,recombinations:full.out.recombinations,topologyActivations:full.out.topologyActivations,errors:full.errors},
    externalEqual,perParty,treatmentDifference,controls,interpretation
  };
  console.log('\nSTAGE 11 — FIXED RECENCY WINDOW ARTIFACT KILL');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(controls))assert(v,k);
  console.log(`OBSERVATION - ${interpretation}`);
  await writeFile('reality-flow-retention-window-kill-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
