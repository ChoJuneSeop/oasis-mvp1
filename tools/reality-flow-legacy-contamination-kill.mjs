import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4183','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  const loader=await readFile('mvp3-topology.html','utf8');
  const loadsLegacy=loader.includes("relation-field.js");
  const loadsTopology=loader.includes("reality-flow-topology.js");
  await sleep(700);browser=await chromium.launch({headless:true});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4183/mvp3-topology.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.OASISRealityFlowTopology&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const live=await page.evaluate(()=>{reset();E.paused=true;for(let i=0;i<1800;i++){E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e)}const S=E.worlds.full;return{legacyRelationFieldActivation:S.c.relationFieldActivation||0,legacyRelationRecombination:S.c.relationRecombination||0,legacyRelationFieldSpiral:S.c.relationFieldSpiral||0,legacyRelationSpiral:S.c.relationSpiral||0,topologyActivation:S.c.realityFlowTopologyActivation||0,topologyObservation:S.c.realityFlowTopologyObservation||0,parties:S.parties.map(P=>({legacyActive:[...(P.relationField?.active||[])],topologyActive:OASISRealityFlowTopology.activeEpisodes(S,P).map(ep=>ep.key),pendingLegacyChoice:P.pendingFieldChoice??null}))}});
  const checks={bothLayersLoaded:loadsLegacy&&loadsTopology,legacyAuthorityExecutes:live.legacyRelationFieldActivation>0,legacyRecombinationExecutes:live.legacyRelationRecombination>0,topologyAlsoExecutes:live.topologyActivation>0,dualMechanismThereforeNotIsolated:true};
  const report={question:'Is the Stage 8 topology candidate causally isolated from the legacy fixed-threshold relation authority layer?',scope:'Diagnostic contamination test. It establishes concurrent execution, not the size or sign of the legacy layer causal effect.',loader:{loadsLegacy,loadsTopology},live,checks,interpretation:Object.values(checks).every(Boolean)?'STAGE9_LEGACY_RELATION_AUTHORITY_CONTAMINATION_CONFIRMED':'STAGE9_CONTAMINATION_NOT_CONFIRMED'};
  console.log('\nSTAGE 9 — LEGACY RELATION AUTHORITY CONTAMINATION KILL');console.log(JSON.stringify(report,null,2));
  assert(checks.bothLayersLoaded,'candidate loader contains both legacy relation field and topology layer');
  assert(checks.legacyAuthorityExecutes,'legacy relation-field activation executes during the same live run');
  assert(checks.legacyRecombinationExecutes,'legacy relation-field recombination executes during the same live run');
  assert(checks.topologyAlsoExecutes,'topology authority also executes during the same live run');
  assert(report.interpretation==='STAGE9_LEGACY_RELATION_AUTHORITY_CONTAMINATION_CONFIRMED','Stage 8 causal attribution is contaminated by concurrent legacy authority');
  await writeFile('reality-flow-legacy-contamination-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
