import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const server=spawn('python3',['-m','http.server','4179','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});

  async function run(url,expectFlow){
    const page=await browser.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(
      flow=>document.title.includes('Laboratory')&&document.getElementById('relationFieldCard')&&document.getElementById('pathCard')&&(!flow||!!window.OASISRealityFlow),
      expectFlow,
      {timeout:60000}
    );
    const out=await page.evaluate(({expectFlow})=>{
      reset();E.paused=true;
      for(let i=0;i<1800;i++){
        E.tick++;
        const e=env(E.tick);
        for(const S of Object.values(E.worlds))tickW(S,e);
      }
      const ext=['rule','utility','qlite','retrieval'];
      const external=Object.fromEntries(ext.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
      const S=E.worlds.full;
      const episodes=S.parties.flatMap(P=>P.relationField?.episodes||[]);
      return {
        title:document.title,
        flowLoaded:!!window.OASISRealityFlow,
        external,
        fullActions:S.c.actions,
        relationEpisodes:episodes.length,
        annotatedEpisodes:episodes.filter(ep=>ep.flowDir!=null).length,
        flowObservations:S.realityFlow?.observations||0,
        flowActivations:S.c.realityFlowRelationActivation||0,
        relationPanel:!!document.getElementById('relationFieldCard'),
        pathPanel:!!document.getElementById('pathCard'),
        expectFlow
      };
    },{expectFlow});
    await page.close();
    return {out,errors};
  }

  const baseline=await run('http://127.0.0.1:4179/index.html',false);
  const mvp3=await run('http://127.0.0.1:4179/mvp3.html',true);
  const externalUnchanged=Object.fromEntries(Object.keys(baseline.out.external).map(k=>[
    k,JSON.stringify(baseline.out.external[k])===JSON.stringify(mvp3.out.external[k])
  ]));

  const report={
    question:'Does the live MVP3 loader activate Reality Flow in the actual browser app without altering the external comparison arms?',
    scope:'Loader/integration regression. It validates boot order and deterministic compatibility, not universal OASIS superiority.',
    baseline:{title:baseline.out.title,errors:baseline.errors,fullActions:baseline.out.fullActions},
    mvp3:{...mvp3.out,errors:mvp3.errors},
    externalUnchanged,
    interpretation:mvp3.out.flowLoaded&&mvp3.errors.length===0&&mvp3.out.flowObservations===1800&&mvp3.out.relationEpisodes>0&&mvp3.out.annotatedEpisodes===mvp3.out.relationEpisodes&&Object.values(externalUnchanged).every(Boolean)
      ?'MVP3_LIVE_LOADER_SURVIVES'
      :'MVP3_LIVE_LOADER_FAILED'
  };

  console.log('\nSTAGE 6 — MVP3 LIVE LOADER INTEGRATION');
  console.log(JSON.stringify(report,null,2));
  assert(baseline.errors.length===0,'MVP2 baseline browser app has no page errors in the control run');
  assert(mvp3.out.flowLoaded,'MVP3 live loader activates OASISRealityFlow');
  assert(mvp3.errors.length===0,'MVP3 live loader has no page errors');
  assert(mvp3.out.flowObservations===1800,'MVP3 live app observes every tested Reality Flow tick');
  assert(mvp3.out.fullActions>0,'MVP3 live app continues realizing OASIS actions');
  assert(mvp3.out.relationEpisodes>0,'MVP3 live app forms relationship episodes');
  assert(mvp3.out.annotatedEpisodes===mvp3.out.relationEpisodes,'all live relation episodes receive flow orientation');
  assert(Object.values(externalUnchanged).every(Boolean),'external comparison traces are unchanged between MVP2 and live MVP3 loader');
  assert(report.interpretation==='MVP3_LIVE_LOADER_SURVIVES','live MVP3 loader integration survives');

  await writeFile('reality-flow-live-app-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
