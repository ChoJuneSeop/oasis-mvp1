import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// OASIS production relation-field temporal window attribution.
// IMPORTANT: production relation-field.js is never modified. Each browser context
// receives a test-only transformed copy derived from the canonical source.

const PORT=4178;
const HORIZONS=[4_000,40_000,120_000];
const MAX_TICK=HORIZONS.at(-1);
const canonicalSource=await readFile('relation-field.js','utf8');
const server=spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const VARIANTS=[
  {name:'B 18/80/1200',r:18,e:80,a:1200},
  {name:'R 180/80/1200',r:180,e:80,a:1200},
  {name:'E 18/800/1200',r:18,e:800,a:1200},
  {name:'A 18/80/12000',r:18,e:80,a:12000},
  {name:'RE 180/800/1200',r:180,e:800,a:1200},
  {name:'RA 180/80/12000',r:180,e:80,a:12000},
  {name:'EA 18/800/12000',r:18,e:800,a:12000},
  {name:'REA 180/800/12000',r:180,e:800,a:12000}
];

function assert(cond,msg){if(!cond)throw new Error(`FAIL - ${msg}`);console.log(`PASS - ${msg}`)}

function transform(source,cfg){
  let out=source;
  const targets=[
    ['P.relationHistory.slice(-18)',`P.relationHistory.slice(-${cfg.r})`],
    ['P.relationField.episodes=P.relationField.episodes.slice(-80)',`P.relationField.episodes=P.relationField.episodes.slice(-${cfg.e})`],
    ['if(E.tick-ep.t>1200)return false',`if(E.tick-ep.t>(globalThis.__RF_TEST_AGE_OVERRIDE??${cfg.a}))return false`]
  ];
  for(const [from,to] of targets){
    if(!out.includes(from))throw new Error(`transform target missing: ${from}`);
    out=out.replace(from,to);
  }
  return out;
}

async function runVariant(browser,cfg){
  const context=await browser.newContext();
  const page=await context.newPage();
  const patched=transform(canonicalSource,cfg);
  await page.route('**/relation-field.js',route=>route.fulfill({status:200,contentType:'application/javascript; charset=utf-8',body:patched}));
  await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof tickW==='function'&&typeof env==='function'&&document.getElementById('relationFieldCard'),null,{timeout:60000});
  const toggle=page.locator('#toggle');
  if((await toggle.textContent())?.includes('일시정지'))await toggle.click();

  const result=await page.evaluate(({cfg,horizons,maxTick})=>{
    const BASE_AGE=1200;
    function fieldSnapshot(S){
      let episodes=0,oldEpisodes=0,relations=0,choices=0,activeKeys=0,maxEpisodeAge=0;
      for(const P of S.parties){
        relations+=P.relationHistory.length;
        choices+=P.choiceHistory.length;
        const eps=P.relationField?.episodes||[];
        episodes+=eps.length;
        oldEpisodes+=eps.filter(ep=>E.tick-ep.t>BASE_AGE).length;
        activeKeys+=(P.relationField?.active||[]).length;
        for(const ep of eps)maxEpisodeAge=Math.max(maxEpisodeAge,E.tick-ep.t);
      }
      return {
        tick:E.tick,actions:S.c.actions||0,relations,choices,episodes,oldEpisodes,activeKeys,maxEpisodeAge,
        recombinations:S.c.relationRecombination||0,activations:S.c.relationFieldActivation||0,
        fieldSpirals:S.c.relationFieldSpiral||0,structuralExpansion:S.c.structuralExpansion||0,
        participationTransition:S.c.participationTransition||0,choiceTransition:S.c.choiceTransition||0,
        relationSpiral:S.c.relationSpiral||0
      };
    }

    function epRelevant(S,P,ep,cutoff){
      if(E.tick-ep.t>cutoff)return false;
      const here=currentPlace(P),target=P.target;
      if(ep.places.includes(here)||ep.places.includes(target))return true;
      if(ep.places.some(id=>Math.abs((places[id]?.r||0)-S.danger)<=0.18))return true;
      const gate=places[target]?.gate;
      return !!gate&&(ep.a===gate||ep.b===gate);
    }

    function targetRelevant(P,ep){
      const target=P.target,gate=places[target]?.gate;
      return ep.places.includes(target)||!!gate&&(ep.a===gate||ep.b===gate);
    }

    function probeSig(S,P,cutoff){
      const F=P.relationField;
      const saved={active:[...(F.active||[])],activations:F.activations,lastActivationTick:F.lastActivationTick,sAct:S.c.relationFieldActivation};
      const priorOverride=globalThis.__RF_TEST_AGE_OVERRIDE;
      let oldLog=null,logWritable=false;
      try{oldLog=log;log=()=>{};logWritable=true}catch{}
      try{
        globalThis.__RF_TEST_AGE_OVERRIDE=cutoff;
        return sig(evalP(S,P,1));
      }finally{
        globalThis.__RF_TEST_AGE_OVERRIDE=priorOverride;
        F.active=saved.active;F.activations=saved.activations;F.lastActivationTick=saved.lastActivationTick;S.c.relationFieldActivation=saved.sAct;
        if(logWritable)try{log=oldLog}catch{}
      }
    }

    const trace={
      decisionEvents:0,oldEpisodeDecisionEvents:0,oldExclusiveActiveEvents:0,oldTargetExclusiveEvents:0,
      counterfactualProbes:0,candidateDiff:0,leaderDiff:0,choiceDiff:0,committedChoiceDiff:0,anySigDiff:0,
      firstAnySigDiffTick:null,firstChoiceDiffTick:null,maxOldActiveAge:0,samples:[]
    };

    const savedE=E;
    E={tick:0,worlds:{full:mkW('full')},paused:true};
    const S=E.worlds.full;
    const prevChoiceLens=new Map(S.parties.map(P=>[P.id,P.choiceHistory.length]));
    const snapshots={};

    for(let t=1;t<=maxTick;t++){
      E.tick=t;
      tickW(S,env(t));

      for(const P of S.parties){
        const prev=prevChoiceLens.get(P.id)||0;
        const now=P.choiceHistory.length;
        if(now>prev){
          trace.decisionEvents+=(now-prev);
          prevChoiceLens.set(P.id,now);
          const eps=P.relationField?.episodes||[];
          const actual=eps.filter(ep=>epRelevant(S,P,ep,cfg.a));
          const recent=eps.filter(ep=>epRelevant(S,P,ep,BASE_AGE));
          const oldActual=actual.filter(ep=>E.tick-ep.t>BASE_AGE);
          if(oldActual.length){
            trace.oldEpisodeDecisionEvents++;
            for(const ep of oldActual)trace.maxOldActiveAge=Math.max(trace.maxOldActiveAge,E.tick-ep.t);
          }
          const recentKeys=new Set(recent.map(ep=>ep.key));
          const oldExclusiveKeys=[...new Set(oldActual.map(ep=>ep.key))].filter(k=>!recentKeys.has(k));
          const oldTarget=oldActual.filter(ep=>targetRelevant(P,ep));
          const recentTarget=recent.filter(ep=>targetRelevant(P,ep));
          if(oldExclusiveKeys.length)trace.oldExclusiveActiveEvents++;
          if(oldTarget.length&&!recentTarget.length)trace.oldTargetExclusiveEvents++;

          // Expensive counterfactual evaluation is restricted to decision events where
          // an >1200-tick episode contributes information not reproduced by recent episodes.
          if(cfg.a>BASE_AGE&&(oldExclusiveKeys.length||(oldTarget.length&&!recentTarget.length))){
            trace.counterfactualProbes++;
            const full=probeSig(S,P,cfg.a);
            const recentOnly=probeSig(S,P,BASE_AGE);
            const cd=full.cands!==recentOnly.cands,ld=full.leader!==recentOnly.leader,qd=full.choice!==recentOnly.choice;
            if(cd)trace.candidateDiff++;if(ld)trace.leaderDiff++;if(qd)trace.choiceDiff++;
            if(qd&&full.choice===P.target)trace.committedChoiceDiff++;
            if(cd||ld||qd){
              trace.anySigDiff++;
              if(trace.firstAnySigDiffTick==null)trace.firstAnySigDiffTick=t;
              if(qd&&trace.firstChoiceDiffTick==null)trace.firstChoiceDiffTick=t;
              if(trace.samples.length<12)trace.samples.push({tick:t,party:P.id,target:P.target,oldExclusiveKeys:oldExclusiveKeys.slice(0,6),oldTargetExclusive:oldTarget.length&&!recentTarget.length,full,recentOnly});
            }
          }
        }
      }
      if(horizons.includes(t))snapshots[t]={...fieldSnapshot(S),trace:{...trace,samples:trace.samples.slice()}};
    }
    const final={...fieldSnapshot(S),trace};
    E=savedE;
    return {snapshots,final};
  },{cfg,horizons:HORIZONS,maxTick:MAX_TICK});

  await context.close();
  const f=result.final;
  console.log(`\n${cfg.name}`);
  console.log(`rel=${f.relations} ep=${f.episodes} oldEp=${f.oldEpisodes} act=${f.activations} part=${f.participationTransition} choice=${f.choiceTransition} structural=${f.structuralExpansion} fieldSpiral=${f.fieldSpirals}`);
  console.log(`oldDecision=${f.trace.oldEpisodeDecisionEvents} oldExclusive=${f.trace.oldExclusiveActiveEvents} oldTargetExclusive=${f.trace.oldTargetExclusiveEvents} probes=${f.trace.counterfactualProbes} sigDiff=${f.trace.anySigDiff} choiceDiff=${f.trace.choiceDiff} committedChoiceDiff=${f.trace.committedChoiceDiff} firstChoiceDiff=${f.trace.firstChoiceDiffTick}`);
  return result;
}

function mean(xs){return xs.reduce((a,b)=>a+b,0)/xs.length}
function contrast(rows,metric,factors){
  const coded=r=>factors.reduce((p,f)=>p*(f==='R'?(r.cfg.r===180?1:-1):f==='E'?(r.cfg.e===800?1:-1):(r.cfg.a===12000?1:-1)),1);
  // Balanced 2^3 factorial descriptive effect: 2 * mean(y * coded product).
  return 2*mean(rows.map(r=>(r.result.final[metric]??r.result.final.trace?.[metric]??0)*coded(r)));
}

let browser;
try{
  await sleep(700);
  browser=await chromium.launch({headless:true});
  const rows=[];
  for(const cfg of VARIANTS)rows.push({cfg,result:await runVariant(browser,cfg)});

  const baseline=rows.find(r=>r.cfg.name.startsWith('B ')).result.final;
  assert(baseline.episodes<=240,'기준군은 파티별 80 episode 상한 유지');
  assert(rows.every(r=>r.result.final.tick===MAX_TICK),'8개 요인조건 모두 120000틱 완주');
  assert(rows.filter(r=>r.cfg.a===1200).every(r=>r.result.final.trace.choiceDiff===0),'1200틱 조건에서는 >1200 재활성화 반사실 차이를 주장하지 않음');

  const metrics=['relations','activations','participationTransition','choiceTransition','structuralExpansion','fieldSpirals'];
  const factorial={};
  for(const m of metrics){
    factorial[m]={
      R_main:contrast(rows,m,['R']),E_main:contrast(rows,m,['E']),A_main:contrast(rows,m,['A']),
      RE_interaction:contrast(rows,m,['R','E']),RA_interaction:contrast(rows,m,['R','A']),EA_interaction:contrast(rows,m,['E','A']),
      REA_interaction:contrast(rows,m,['R','E','A'])
    };
  }

  const traceMetrics=['oldEpisodeDecisionEvents','oldExclusiveActiveEvents','oldTargetExclusiveEvents','counterfactualProbes','anySigDiff','choiceDiff','committedChoiceDiff'];
  const traceFactorial={};
  for(const m of traceMetrics)traceFactorial[m]={R_main:contrast(rows,m,['R']),E_main:contrast(rows,m,['E']),A_main:contrast(rows,m,['A']),RE_interaction:contrast(rows,m,['R','E']),RA_interaction:contrast(rows,m,['R','A']),EA_interaction:contrast(rows,m,['E','A']),REA_interaction:contrast(rows,m,['R','E','A'])};

  const report={
    design:{
      purpose:'canonical relation-field temporal-window causal attribution; descriptive 2x2x2 factorial',
      status:'test-only adapters; production relation-field.js unchanged',
      factors:{R:'relation history 18 vs 180',E:'episode retention 80 vs 800',A:'reactivation age 1200 vs 12000'},
      horizons:HORIZONS,
      externalReality:'all conditions receive the same deterministic env(tick); endogenous trajectories may diverge after their own choices',
      interpretationLimits:['factorial contrasts are descriptive, not statistical inference','counterfactual signature probes are within-state diagnostics and do not rewrite the realized trajectory','Stage 30 unrealized-possibility causality is not tested here']
    },
    rows,
    factorial,
    traceFactorial
  };
  await writeFile('relation-window-factorial-long-horizon-report.json',JSON.stringify(report,null,2));
  console.log('\nFACTORIAL CONTRASTS (descriptive)');
  for(const [m,v] of Object.entries(factorial))console.log(m,JSON.stringify(v));
  console.log('\nRESULT: 2x2x2 production relation-field temporal-window attribution completed.');
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
