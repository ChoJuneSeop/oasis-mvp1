import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const server=spawn('python3',['-m','http.server','4182','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}
let browser;
try{
  await sleep(700);browser=await chromium.launch({headless:true});
  async function run(url,topology){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(t=>document.title.includes('Laboratory')&&document.getElementById('relationFieldCard')&&(!t||!!window.OASISRealityFlowTopology),topology,{timeout:60000});
    const out=await page.evaluate(()=>{
      reset();E.paused=true;
      for(let i=0;i<1800;i++){E.tick++;const e=env(E.tick);for(const S of Object.values(E.worlds))tickW(S,e)}
      const ext=['rule','utility','qlite','retrieval'];const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full,eps=S.parties.flatMap(P=>P.relationField?.episodes||[]),patterns=[...new Set(eps.map(ep=>ep.flowTopologyKey).filter(x=>x!=null))];
      return{title:document.title,external,topologyLoaded:!!window.OASISRealityFlowTopology,actions:S.c.actions,episodes:eps.length,annotated:eps.filter(ep=>ep.flowTopologyKey!=null).length,patterns,observations:S.realityFlowTopology?.observations||0,activations:S.c.realityFlowTopologyActivation||0};
    });await page.close();return{out,errors};
  }
  const base=await run('http://127.0.0.1:4182/index.html',false),candidate=await run('http://127.0.0.1:4182/mvp3-topology.html',true);
  const externalUnchanged=Object.fromEntries(Object.keys(base.out.external).map(k=>[k,JSON.stringify(base.out.external[k])===JSON.stringify(candidate.out.external[k])]));
  const report={question:'Does exact qualitative flow-run topology remain operational in the live 1800-tick world without altering external comparison arms?',scope:'Viability/regression only. Nonzero activation means the topology is not sterile in this world; it does not establish general optimality.',baseline:{title:base.out.title,errors:base.errors},candidate:{...candidate.out,errors:candidate.errors},externalUnchanged,checks:{noPageErrors:candidate.errors.length===0,allTicksObserved:candidate.out.observations===1800,actionsContinue:candidate.out.actions>0,episodesExist:candidate.out.episodes>0,allEpisodesAnnotated:candidate.out.annotated===candidate.out.episodes,nonSterileActivation:candidate.out.activations>0,multipleObservedPatterns:candidate.out.patterns.length>1,externalUnchanged:Object.values(externalUnchanged).every(Boolean)}};
  report.interpretation=Object.values(report.checks).every(Boolean)?'STAGE8_TOPOLOGY_LIVE_VIABILITY_SURVIVES':'STAGE8_TOPOLOGY_LIVE_VIABILITY_FAILED';
  console.log('\nSTAGE 8B — FLOW TOPOLOGY LIVE VIABILITY REGRESSION');console.log(JSON.stringify(report,null,2));
  for(const [k,v] of Object.entries(report.checks))assert(v,k);
  await writeFile('reality-flow-topology-live-report.json',JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM')}
