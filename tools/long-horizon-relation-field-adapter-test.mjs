import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const PORT=4177;
const HORIZONS=[4_000,40_000,120_000];
const MAX_TICK=HORIZONS.at(-1);
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const canonicalSource=await readFile('relation-field.js','utf8');

function transformRelationField(source){
  const targets=[
    ['P.relationHistory.slice(-18)','P.relationHistory.slice(-180)'],
    ['P.relationField.episodes=P.relationField.episodes.slice(-80)','P.relationField.episodes=P.relationField.episodes.slice(-800)'],
    ['if(E.tick-ep.t>1200)return false','if(E.tick-ep.t>12000)return false']
  ];
  let out=source;
  for(const [from,to] of targets){
    if(!out.includes(from))throw new Error(`adapter transform target missing: ${from}`);
    out=out.replace(from,to);
  }
  return out;
}

function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}

async function runVariant(browser,name,extended){
  const context=await browser.newContext();
  const page=await context.newPage();
  if(extended){
    const patched=transformRelationField(canonicalSource);
    await page.route('**/relation-field.js',route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:patched}));
  }
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof env==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({horizons,maxTick})=>{
    function summary(S){
      let episodes=0,oldEpisodes=0,activeKeys=0,oldActiveKeys=0,relations=0,choices=0;
      for(const P of S.parties){
        relations+=P.relationHistory.length;
        choices+=P.choiceHistory.length;
        const eps=P.relationField?.episodes||[];
        episodes+=eps.length;
        oldEpisodes+=eps.filter(ep=>E.tick-ep.t>1200).length;
        const active=new Set(P.relationField?.active||[]);
        activeKeys+=active.size;
        const oldKeys=new Set(eps.filter(ep=>E.tick-ep.t>1200).map(ep=>ep.key));
        for(const k of active)if(oldKeys.has(k))oldActiveKeys++;
      }
      return {
        tick:E.tick,
        actions:S.c.actions||0,
        relations,
        choices,
        episodes,
        oldEpisodes,
        activeKeys,
        oldActiveKeys,
        recombinations:S.c.relationRecombination||0,
        activations:S.c.relationFieldActivation||0,
        fieldSpirals:S.c.relationFieldSpiral||0,
        structuralExpansion:S.c.structuralExpansion||0,
        participationTransition:S.c.participationTransition||0,
        choiceTransition:S.c.choiceTransition||0,
        relationSpiral:S.c.relationSpiral||0,
        pathGenerated:S.c.pathGenerated||0,
        pathCandidate:S.c.pathCandidate||0,
        pathSelected:S.c.pathSelected||0,
        pathRealized:S.c.pathRealized||0,
        pathChanged:S.c.pathChanged||0
      };
    }

    const savedE=E;
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full;
    const snapshots={};
    for(let t=1;t<=maxTick;t++){
      E.tick=t;
      tickW(S,env(t));
      if(horizons.includes(t))snapshots[t]=summary(S);
    }
    const final=summary(S);
    E=savedE;
    return {snapshots,final};
  },{horizons:HORIZONS,maxTick:MAX_TICK});

  await context.close();
  console.log(`\n${name}`);
  for(const t of HORIZONS){const r=result.snapshots[t];console.log(`tick=${t} rel=${r.relations} ep=${r.episodes} oldEp=${r.oldEpisodes} act=${r.activations} oldActive=${r.oldActiveKeys} part=${r.participationTransition} choice=${r.choiceTransition} structural=${r.structuralExpansion} spiral=${r.fieldSpirals}`)}
  return result;
}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const baseline=await runVariant(browser,'기준 재현군 18/80/1200',false);
  const extended=await runVariant(browser,'장기 확장군 180/800/12000',true);

  assert(baseline.snapshots[4000].tick===4000&&extended.snapshots[4000].tick===4000,'두 군이 동일한 4000틱 현실을 통과');
  assert(baseline.final.tick===MAX_TICK&&extended.final.tick===MAX_TICK,'두 군이 동일한 120000틱 현실을 완주');
  assert(baseline.final.episodes<=240,'기준군은 파티별 최근 80 episode 상한을 유지');
  assert(extended.final.episodes<=2400,'확장군은 파티별 최근 800 episode 상한을 유지');
  assert(baseline.final.oldActiveKeys===0,'기준군에서 1200틱 초과 관계는 현재 활성에 참여하지 않음');

  const report={
    design:{
      status:'adapter validation; canonical production code unchanged',
      canonical:{relationWindow:18,episodeWindow:80,reactivationAge:1200},
      extended:{relationWindow:180,episodeWindow:800,reactivationAge:12000},
      horizons:HORIZONS,
      invariantRules:['same index/base engine','same mkW(full)','same tickW','same env(tick)','same choose/outcome hooks','only relation-field temporal windows expanded'],
      interpretation:'Differences are window-sensitivity evidence. They do not retroactively change canonical browser-world results and are not OASIS superiority evidence.'
    },
    baseline,
    extended,
    delta:Object.fromEntries(HORIZONS.map(t=>{
      const b=baseline.snapshots[t],e=extended.snapshots[t];
      return [t,{
        episodes:e.episodes-b.episodes,
        oldEpisodes:e.oldEpisodes-b.oldEpisodes,
        activations:e.activations-b.activations,
        oldActiveKeys:e.oldActiveKeys-b.oldActiveKeys,
        structuralExpansion:e.structuralExpansion-b.structuralExpansion,
        participationTransition:e.participationTransition-b.participationTransition,
        choiceTransition:e.choiceTransition-b.choiceTransition,
        fieldSpirals:e.fieldSpirals-b.fieldSpirals,
        relationSpiral:e.relationSpiral-b.relationSpiral
      }];
    }))
  };
  await writeFile('long-horizon-relation-field-adapter-report.json',JSON.stringify(report,null,2));
  console.log('\nRESULT: production relation-field temporal-window sensitivity run completed. Interpret only as canonical-vs-extended window behavior.');
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
