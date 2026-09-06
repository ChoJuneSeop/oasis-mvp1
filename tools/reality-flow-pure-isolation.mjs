import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4184','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(c,m){if(!c)throw new Error(`FAIL - ${m}`);console.log(`PASS - ${m}`)}
let browser;
try{
  const pureSource=await readFile('reality-flow-pure.js','utf8');
  const noLegacyThresholdLiterals=!pureSource.includes('0.18')&&!pureSource.includes('0.38')&&!pureSource.includes('1200');
  await sleep(700);browser=await chromium.launch({headless:true});
  async function run(url,mode){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(m=>document.title.includes('Laboratory')&&(m!=='pure'||!!window.OASISRealityFlowPure)&&(m!=='contaminated'||!!window.OASISRealityFlowTopology),mode,{timeout:60000});
    const out=await page.evaluate(({mode})=>{
      reset();E.paused=true;
      for(let i=0;i<1800;i++){E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e)}
      const ext=['rule','utility','qlite','retrieval'];
      const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full,eps=S.parties.flatMap(P=>P.relationField?.episodes||[]);
      const resources=performance.getEntriesByType('resource').map(x=>x.name);
      return{mode,title:document.title,resources,external,fullChoices:S.parties.map(P=>P.choiceHistory.map(x=>x.target)),actions:S.c.actions,episodes:eps.length,pureAnnotated:eps.filter(ep=>ep.flowTopologyKey!=null).length,pureObservations:S.realityFlowPure?.observations||0,pureActivations:S.c.pureFlowActivation||0,pureRecombinations:S.c.pureRelationRecombination||0,legacyActivation:S.c.relationFieldActivation||0,legacyRecombination:S.c.relationRecombination||0,pendingLegacy:S.parties.map(P=>P.pendingFieldChoice??null),relationPanel:!!document.getElementById('relationFieldCard')};
    },{mode});await page.close();return{out,errors};
  }
  const baseline=await run('http://127.0.0.1:4184/index.html','baseline');
  const contaminated=await run('http://127.0.0.1:4184/mvp3-topology.html','contaminated');
  const pure=await run('http://127.0.0.1:4184/mvp3-pure.html','pure');
  const externalUnchanged=Object.fromEntries(Object.keys(baseline.out.external).map(k=>[k,JSON.stringify(baseline.out.external[k])===JSON.stringify(pure.out.external[k])]));
  const legacyResourceLoaded=pure.out.resources.some(x=>x.includes('relation-field.js'));
  const oasisPathChangedAfterIsolation=JSON.stringify(contaminated.out.fullChoices)!==JSON.stringify(pure.out.fullChoices);
  const checks={noLegacyThresholdLiterals,noLegacyResourceLoaded:!legacyResourceLoaded,noLegacyAuthorityCounter:pure.out.legacyActivation===0,noLegacyRecombinationCounter:pure.out.legacyRecombination===0,noPendingLegacyChoice:pure.out.pendingLegacy.every(x=>x==null),pureLayerLoaded:pure.out.pureObservations===1800,pureRelationFormation:pure.out.pureRecombinations>0&&pure.out.episodes>0,allPureEpisodesAnnotated:pure.out.pureAnnotated===pure.out.episodes,pureAuthorityOperational:pure.out.pureActivations>0,actionsContinue:pure.out.actions>0,noPageErrors:pure.errors.length===0,externalUnchanged:Object.values(externalUnchanged).every(Boolean)};
  const report={question:'Can topology-based relation authority operate after removing the legacy fixed-threshold relation-field execution path?',scope:'Isolates fixed-threshold relation-field authority while retaining the existing world, relation history formation, possibility-path layer, and external comparison arms. OASIS path difference versus the contaminated candidate is reported descriptively, not required for pass.',baseline:{title:baseline.out.title,errors:baseline.errors},contaminated:{actions:contaminated.out.actions,legacyActivation:contaminated.out.legacyActivation,fullChoices:contaminated.out.fullChoices},pure:{...pure.out,errors:pure.errors,legacyResourceLoaded},externalUnchanged,oasisPathChangedAfterIsolation,checks};
  report.interpretation=Object.values(checks).every(Boolean)?'STAGE10_PURE_TOPOLOGY_ISOLATION_SURVIVES':'STAGE10_PURE_TOPOLOGY_ISOLATION_FAILED';
  console.log('\nSTAGE 10 — PURE TOPOLOGY ISOLATION');console.log(JSON.stringify(report,null,2));
  for(const[k,v]of Object.entries(checks))assert(v,k);
  await writeFile('reality-flow-pure-isolation-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
