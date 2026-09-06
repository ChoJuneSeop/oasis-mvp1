import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4184','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  async function run(url,isolated){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(i=>document.title.includes('Laboratory')&&(!i||(!!window.OASISRelationExperienceStore&&!!window.OASISRealityFlowTopology)),isolated,{timeout:60000});
    const out=await page.evaluate(()=>{
      reset();E.paused=true;
      for(let i=0;i<1800;i++){E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e)}
      const ext=['rule','utility','qlite','retrieval'];
      const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full,eps=S.parties.flatMap(P=>P.relationField?.episodes||[]);
      return{
        title:document.title,
        external,
        storeLoaded:!!window.OASISRelationExperienceStore,
        topologyLoaded:!!window.OASISRealityFlowTopology,
        legacyPanelPresent:!!document.getElementById('relationFieldCard'),
        legacyActivation:S.c.relationFieldActivation||0,
        legacySpiral:S.c.relationFieldSpiral||0,
        relationRecombination:S.c.relationRecombination||0,
        topologyObservations:S.c.realityFlowTopologyObservation||0,
        topologyActivations:S.c.realityFlowTopologyActivation||0,
        actions:S.c.actions||0,
        episodes:eps.length,
        annotated:eps.filter(ep=>ep.flowTopologyKey!=null).length,
        patterns:[...new Set(eps.map(ep=>ep.flowTopologyKey).filter(Boolean))],
        pendingLegacy:S.parties.filter(P=>P.pendingFieldChoice!=null).length
      };
    });await page.close();return{out,errors};
  }
  const base=await run('http://127.0.0.1:4184/index.html',false);
  const iso=await run('http://127.0.0.1:4184/mvp3-topology-isolated.html',true);
  const externalUnchanged=Object.fromEntries(Object.keys(base.out.external).map(k=>[k,JSON.stringify(base.out.external[k])===JSON.stringify(iso.out.external[k])]));
  const checks={
    isolatedLoadsStoreAndTopology:iso.out.storeLoaded&&iso.out.topologyLoaded,
    noLegacyAuthorityUI:!iso.out.legacyPanelPresent,
    noLegacyAuthorityActivation:iso.out.legacyActivation===0&&iso.out.legacySpiral===0&&iso.out.pendingLegacy===0,
    storageStillFormsExperiences:iso.out.relationRecombination>0&&iso.out.episodes>0,
    allStoredExperiencesAnnotated:iso.out.annotated===iso.out.episodes,
    topologyActuallyRuns:iso.out.topologyObservations===1800&&iso.out.topologyActivations>0,
    actionsContinue:iso.out.actions>0,
    multipleFlowPatternsObserved:iso.out.patterns.length>1,
    externalComparisonUnchanged:Object.values(externalUnchanged).every(Boolean),
    noPageErrors:iso.errors.length===0
  };
  const report={
    question:'Can the topology authority operate in the live world after removing the legacy fixed-threshold relation authority while preserving only relation-experience storage?',
    scope:'Causal-isolation ablation. The storage composition mechanics are intentionally preserved from the legacy implementation so this stage changes authority, not experience formation. It does not establish novelty or universal superiority.',
    baseline:{title:base.out.title,errors:base.errors},isolated:{...iso.out,errors:iso.errors},externalUnchanged,checks,
    interpretation:Object.values(checks).every(Boolean)?'STAGE10_TOPOLOGY_CAUSAL_ISOLATION_SURVIVES':'STAGE10_TOPOLOGY_CAUSAL_ISOLATION_FAILED'
  };
  console.log('\nSTAGE 10 — TOPOLOGY AUTHORITY CAUSAL ISOLATION');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(checks))assert(v,k);
  await writeFile('reality-flow-topology-isolation-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
