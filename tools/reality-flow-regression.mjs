import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const server = spawn('python3', ['-m', 'http.server', '4178', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}

let browser;
try{
  const source=await readFile('reality-flow.js','utf8');
  assert(!source.includes('0.18'),'Reality Flow layer does not reuse legacy 0.18 relevance threshold');
  assert(!source.includes('0.38'),'Reality Flow layer does not reuse legacy 0.38 participation threshold');
  assert(!source.includes('1200'),'Reality Flow layer does not reuse legacy 1200-tick age cutoff');

  await sleep(700);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:4178/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>document.title.includes('Dual Comparison Laboratory')&&document.getElementById('relationFieldCard'),null,{timeout:60000});

  const baseline=await page.evaluate(()=>{
    reset();E.paused=true;
    for(let i=0;i<1800;i++){
      E.tick++;const e=env(E.tick);
      for(const S of Object.values(E.worlds))tickW(S,e);
    }
    const keys=['rule','utility','qlite','retrieval'];
    return Object.fromEntries(keys.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
  });

  await page.addScriptTag({path:path.resolve('reality-flow.js')});
  await page.waitForFunction(()=>!!window.OASISRealityFlow);

  const withFlow=await page.evaluate(()=>{
    reset();E.paused=true;
    for(let i=0;i<1800;i++){
      E.tick++;const e=env(E.tick);
      for(const S of Object.values(E.worlds))tickW(S,e);
    }
    const keys=['rule','utility','qlite','retrieval'];
    const external=Object.fromEntries(keys.map(k=>[k,E.worlds[k].parties.map(P=>P.choiceHistory.map(x=>x.target))]));
    const full=E.worlds.full;
    const eps=full.parties.flatMap(P=>P.relationField?.episodes||[]);
    return {
      external,
      fullActions:full.c.actions,
      flowObservations:full.realityFlow?.observations||0,
      relationEpisodes:eps.length,
      annotatedEpisodes:eps.filter(ep=>ep.flowDir!=null).length,
      flowActivations:full.c.realityFlowRelationActivation||0
    };
  });

  const unchanged={};
  for(const k of Object.keys(baseline)) unchanged[k]=JSON.stringify(baseline[k])===JSON.stringify(withFlow.external[k]);

  const report={
    question:'Does the minimal Reality Flow layer preserve existing external comparison behavior while adding path observations to OASIS?',
    scope:'Compatibility regression only; unchanged external traces do not prove external-model equivalence to commercial systems.',
    externalUnchanged:unchanged,
    withFlow,
    interpretation:Object.values(unchanged).every(Boolean)&&withFlow.flowObservations>0&&withFlow.fullActions>0&&withFlow.relationEpisodes>0&&withFlow.annotatedEpisodes===withFlow.relationEpisodes
      ?'MVP3_LAYER_COMPATIBILITY_SURVIVES'
      :'MVP3_LAYER_COMPATIBILITY_FAILED'
  };

  console.log('\nSTAGE 5 — REALITY FLOW COMPATIBILITY REGRESSION');
  console.log(JSON.stringify(report,null,2));
  assert(Object.values(unchanged).every(Boolean),'Rule/Utility/Q/Retrieval comparison traces remain unchanged under the added layer');
  assert(withFlow.flowObservations>0,'Reality Flow records temporal transitions during the actual engine run');
  assert(withFlow.fullActions>0,'OASIS continues realizing actions with the layer loaded');
  assert(withFlow.relationEpisodes>0,'actual OASIS run still forms relation-field episodes');
  assert(withFlow.annotatedEpisodes===withFlow.relationEpisodes,'formed relation episodes acquire temporal orientation from live flow');
  assert(report.interpretation==='MVP3_LAYER_COMPATIBILITY_SURVIVES','MVP3 compatibility regression survives');

  await writeFile('reality-flow-regression-report.json',JSON.stringify(report,null,2));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
